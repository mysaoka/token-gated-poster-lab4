import Web3 from 'web3';
export const posterAbi = [
 {type:'event',name:'NewPost',anonymous:false,inputs:[{name:'user',type:'address',indexed:true},{name:'content',type:'string',indexed:false},{name:'tag',type:'string',indexed:true}]},
 {type:'function',name:'post',stateMutability:'nonpayable',inputs:[{name:'content',type:'string'},{name:'tag',type:'string'}],outputs:[]}
] as const;
export type Post = {id:string;author:string;content:string;tag:string|null;tagHash:string;transactionHash:string;block:string};
export function hashTag(tag:string){return Web3.utils.keccak256(Web3.utils.utf8ToHex(tag));}
// Smart-account transactions can embed post() calldata inside a batch.
// Accept a candidate only when both its content and tag hash match the event.
export function recoverTag(input:string,content:string,tagHash:string):string|null{
 const data=input.replace(/^0x/,'').toLowerCase();
 const selector=Web3.utils.keccak256('post(string,string)').slice(2,10);
 for(let offset=data.indexOf(selector);offset>=0;offset=data.indexOf(selector,offset+2)){
  if(offset%2!==0)continue;
  try{
   const decoded=new Web3().eth.abi.decodeParameters(['string','string'],'0x'+data.slice(offset+8));
   const candidate=String(decoded[1]);
   if(String(decoded[0])===content&&hashTag(candidate).toLowerCase()===tagHash.toLowerCase())return candidate;
  }catch{/* A selector-like byte sequence may not be a valid ABI call. */}
 }
 return null;
}
// Indexed string values are hashes. Recover the text from post() calldata and validate it.
export async function readPosts(web3:Web3,address:string,fromBlock:bigint,progress:(s:string)=>void=()=>{}){
 if(!Web3.utils.isAddress(address)) throw new Error('Сначала настройте адрес контракта.');
 if((await web3.eth.getCode(address))==='0x') throw new Error('По этому адресу нет контракта в выбранной сети.');
 const latest=await web3.eth.getBlockNumber();
 const topic=web3.eth.abi.encodeEventSignature('NewPost(address,string,string)');
 const result:Post[]=[];let start=fromBlock;let span=5000n;
 while(start<=latest){
  const end=start+span-1n>latest?latest:start+span-1n;
  progress(`Чтение блоков ${start}–${end} из ${latest}`);
  let logs;
  try{logs=await web3.eth.getPastLogs({address,fromBlock:start,toBlock:end,topics:[topic]});}
  catch(error){if(span<=1n)throw error;span=span/2n;continue;}
  for(const log of logs){
   if(typeof log==='string'||!log.topics||!log.data||!log.transactionHash)continue;
   const author=web3.utils.toChecksumAddress('0x'+String(log.topics[1]).slice(-40));
   const content=String(web3.eth.abi.decodeParameter('string',String(log.data)));
   const tagHash=String(log.topics[2]);const transactionHash=String(log.transactionHash);let tag:string|null=null;
   try{
    const tx=await web3.eth.getTransaction(transactionHash);const input=String(tx.input);
    tag=recoverTag(input,content,tagHash);
   }catch{/* Keep event visible even when calldata lookup is unavailable. */}
   result.push({id:`${transactionHash}-${log.logIndex}`,author,content,tag,tagHash,transactionHash,block:String(log.blockNumber)});
  }
  start=end+1n;
 }
 return result.reverse();
}
