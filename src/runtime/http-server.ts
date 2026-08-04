import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { BetaApplication } from "./beta-application";
import type { Jurisdiction } from "../domain/models";
import { JsonFileRuntimeStateStore } from "./durable-store";
import { RELEASE_VERSION, RELEASE_SERVICE } from "../release/metadata";
import { existsSync, readFileSync } from "node:fs";

export type ServerOptions = { app?: BetaApplication };
function send(res:ServerResponse,status:number,body:unknown):void{res.writeHead(status,{"content-type":"application/json; charset=utf-8"});res.end(JSON.stringify(body));}
async function bytes(req:IncomingMessage,limit=15*1024*1024):Promise<Uint8Array>{const chunks:Uint8Array[]=[];let size=0;for await(const chunk of req){const b=Buffer.from(chunk);size+=b.length;if(size>limit)throw new Error("UPLOAD_TOO_LARGE");chunks.push(b)}return Buffer.concat(chunks)}
async function json(req:IncomingMessage):Promise<Record<string,unknown>>{const b=await bytes(req);if(!b.length)return{};try{return JSON.parse(Buffer.from(b).toString("utf8"))}catch{throw new Error("INVALID_JSON")}}
function bearer(req:IncomingMessage):string{const h=req.headers.authorization??"";if(!h.startsWith("Bearer "))throw new Error("UNAUTHENTICATED");return h.slice(7)}
function statusFor(e:string):number{if(["UNAUTHENTICATED","INVALID_CREDENTIALS"].includes(e))return 401;if(e==="FORBIDDEN")return 403;if(e.endsWith("_NOT_FOUND"))return 404;if(["EMAIL_ALREADY_REGISTERED"].includes(e))return 409;if(e==="UPLOAD_TOO_LARGE")return 413;if(e==="UNSUPPORTED_CONTENT_TYPE")return 415;if(e==="LIVE_OCR_REQUIRED")return 422;return 400}
export function createBetaHttpServer(options:ServerOptions={}){
 const app=options.app??new BetaApplication();
 return createServer(async(req,res)=>{try{const method=req.method??"GET";const url=new URL(req.url??"/","http://localhost");
 if(method==="GET"&&url.pathname==="/health")return send(res,200,{status:"ok",service:RELEASE_SERVICE+"-beta-api",version:RELEASE_VERSION,persistence:"durable-capable",dependencies:app.dependencyStatus()});
 if(method==="POST"&&url.pathname==="/v1/auth/register"){const b=await json(req);return send(res,201,app.register({email:String(b.email??""),displayName:String(b.displayName??""),password:String(b.password??"")}))}
 if(method==="POST"&&url.pathname==="/v1/auth/login"){const b=await json(req);return send(res,200,app.login({email:String(b.email??""),password:String(b.password??"")}))}
 if(method==="GET"&&url.pathname==="/v1/properties")return send(res,200,app.listProperties(bearer(req)));
 if(method==="POST"&&url.pathname==="/v1/properties"){const b=await json(req);return send(res,201,app.createProperty(bearer(req),{label:String(b.label??""),jurisdiction:String(b.jurisdiction??"UNKNOWN") as Jurisdiction}))}
 const raw=url.pathname.match(/^\/v1\/properties\/([^/]+)\/documents\/file$/);if(method==="POST"&&raw){const contentType=String(req.headers["content-type"]??"application/octet-stream").split(";")[0];const fileName=String(req.headers["x-file-name"]??"document.bin");return send(res,201,app.uploadDocument(bearer(req),{propertyId:raw[1],fileName,contentType,bytes:await bytes(req)}))}
 const dm=url.pathname.match(/^\/v1\/properties\/([^/]+)\/documents$/);if(method==="POST"&&dm){const b=await json(req);return send(res,201,app.uploadTextDocument(bearer(req),{propertyId:dm[1],fileName:String(b.fileName??"document.txt"),text:String(b.text??"")}))}
 const am=url.pathname.match(/^\/v1\/properties\/([^/]+)\/analyse$/);if(method==="POST"&&am)return send(res,200,await app.analyseProperty(bearer(req),am[1]));
 const pm=url.pathname.match(/^\/v1\/properties\/([^/]+)\/passport$/);if(method==="GET"&&pm)return send(res,200,app.getPassport(bearer(req),pm[1]));
 const rm=url.pathname.match(/^\/v1\/reports\/([^/]+)$/);if(method==="GET"&&rm)return send(res,200,app.getReportByVerificationId(rm[1]));
 if(method==="POST"&&url.pathname==="/v1/dependencies/probe")return send(res,200,{dependencies:await app.probeDependencies()});
  if(method==="GET"&&url.pathname==="/v1/probes/history"){const auditPath=process.env.PAKKADEED_PROBE_AUDIT_PATH??"./var/probe-audit.jsonl";if(!existsSync(auditPath))return send(res,200,{entries:[]});const lines=readFileSync(auditPath,"utf8").trim().split("\n").filter(Boolean);const limit=Number(url.searchParams.get("limit")??50);const entries=lines.slice(-limit).map((l:string)=>{try{return JSON.parse(l)}catch{return {raw:l}}});return send(res,200,{entries});}
 return send(res,404,{error:"NOT_FOUND"});
 }catch(error){const m=error instanceof Error?error.message:"INTERNAL_ERROR";return send(res,statusFor(m),{error:m})}})
}
if(require.main===module){const port=Number(process.env.PORT??3001);const statePath=process.env.PAKKADEED_STATE_PATH??"./var/runtime-state.json";const app=new BetaApplication({store:new JsonFileRuntimeStateStore(statePath),storageSecret:process.env.PAKKADEED_STORAGE_SECRET??"local-beta-storage-secret-change-before-production"});createBetaHttpServer({app}).listen(port,()=>console.log(`PakkaDeed durable beta API listening on :${port}`));}
