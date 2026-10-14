import Web3 from 'web3';

const gateAbi = [
 {type:'function',name:'tokenAddress',stateMutability:'view',inputs:[],outputs:[{type:'address',name:''}]},
 {type:'function',name:'threshold',stateMutability:'view',inputs:[],outputs:[{type:'uint256',name:''}]},
] as const;
const tokenAbi = [
 {type:'function',name:'balanceOf',stateMutability:'view',inputs:[{type:'address',name:'account'}],outputs:[{type:'uint256',name:''}]},
 {type:'function',name:'decimals',stateMutability:'view',inputs:[],outputs:[{type:'uint8',name:''}]},
 {type:'function',name:'symbol',stateMutability:'view',inputs:[],outputs:[{type:'string',name:''}]},
] as const;
export type Gate = {tokenAddress:string;threshold:bigint;balance:bigint;decimals:number;symbol:string;allowed:boolean};
export function formatUnits(value:bigint,decimals:number):string {
 const unit=10n**BigInt(decimals);
 const fractional=(value%unit).toString().padStart(decimals,'0').replace(/0+$/,'');
 return (value/unit).toString()+(fractional?'.'+fractional:'');
}
export async function readGate(web3:Web3,posterAddress:string,userAddress:string):Promise<Gate> {
 const poster=new web3.eth.Contract(gateAbi,posterAddress);
 const block=await web3.eth.getBlockNumber();
 const [tokenAddress,threshold]=await Promise.all([
  poster.methods.tokenAddress().call({},block),poster.methods.threshold().call({},block),
 ]);
 if(/^0x0{40}$/i.test(tokenAddress)||await web3.eth.getCode(tokenAddress,block)==='0x') {
  throw new Error('В Poster не настроен действующий контракт токена. Публикация недоступна.');
 }
 const token=new web3.eth.Contract(tokenAbi,tokenAddress);
 const [balance,decimals,symbol]=await Promise.all([
  token.methods.balanceOf(userAddress).call({},block),token.methods.decimals().call({},block),token.methods.symbol().call({},block),
 ]);
 const thresholdValue=BigInt(threshold);
 const balanceValue=BigInt(balance);
 return {tokenAddress,threshold:thresholdValue,balance:balanceValue,decimals:Number(decimals),symbol,allowed:balanceValue>=thresholdValue};
}
