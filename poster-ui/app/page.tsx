"use client";
import {useEffect,useRef,useState} from 'react';
import Web3,{type EIP1193Provider,type Web3APISpec} from 'web3';
import deployment from '@/lib/deployment.json';
import {hashTag,posterAbi,readPosts,type Post} from '@/lib/poster';
import {readGate,formatUnits,type Gate} from '@/lib/gate';
type Wallet=EIP1193Provider<Web3APISpec> & {on?:(event:string,handler:()=>void)=>void;removeListener?:(event:string,handler:()=>void)=>void};
declare global{interface Window{ethereum?:Wallet;}}
const expectedChain=BigInt(deployment.chainId);
const errorText=(e:unknown)=>e instanceof Error?e.message:String(e);
export default function Home(){
 const [userAddress,setUserAddress]=useState('');const [content,setContent]=useState('');const [tag,setTag]=useState('');
 const [filter,setFilter]=useState('');const [posts,setPosts]=useState<Post[]>([]);
 const [status,setStatus]=useState('Подключите MetaMask, чтобы открыть гостевую книгу.');
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [transaction,setTransaction]=useState('');
 const generation=useRef(0);
 const [gate,setGate]=useState<Gate|null>(null);
 const configured=Web3.utils.isAddress(deployment.address)&&BigInt(deployment.blockNumber)>0n;
 useEffect(()=>{
  const wallet=window.ethereum;
  const reset=()=>{generation.current++;setUserAddress('');setGate(null);setPosts([]);setBusy(false);setTransaction('');setStatus('Аккаунт или сеть изменены. Подключите кошелёк заново.');};
  wallet?.on?.('accountsChanged',reset);wallet?.on?.('chainChanged',reset);
  return()=>{wallet?.removeListener?.('accountsChanged',reset);wallet?.removeListener?.('chainChanged',reset);};
 },[]);
 async function client(){
  if(!window.ethereum)throw new Error('Откройте страницу в браузере с установленным MetaMask.');
  const web3=new Web3(window.ethereum);
  if(await web3.eth.getChainId()!==expectedChain){
   await window.ethereum.request({method:'wallet_switchEthereumChain',params:[{chainId:'0xaa36a7'}]});
  }
  if(await web3.eth.getChainId()!==expectedChain)throw new Error('Выберите в MetaMask сеть Ethereum Sepolia.');
  return web3;
 }
 async function load(web3:Web3,ticket:number){
  const list=await readPosts(web3,deployment.address,BigInt(deployment.blockNumber),text=>{if(generation.current===ticket)setStatus(text);});
  if(generation.current===ticket){setPosts(list);setStatus(`Загружено сообщений: ${list.length}`);}
 }
 async function connect(){
  setError('');setBusy(true);
  try{
   if(!window.ethereum)throw new Error('Установите MetaMask в этом браузере.');
   const addresses=await window.ethereum.request({method:'eth_requestAccounts'}) as string[];
   if(!addresses[0])throw new Error('MetaMask не предоставил аккаунт.');
   const web3=await client();const ticket=++generation.current;setUserAddress(addresses[0]);
   if(configured){
    const currentGate=await readGate(web3,deployment.address,addresses[0]);
    if(generation.current!==ticket)return;
    setGate(currentGate);await load(web3,ticket);
   }else setStatus('Кошелёк подключён. Адрес развёрнутого контракта ещё не настроен.');
  }catch(e){setError(errorText(e));}finally{setBusy(false);}
 }
 async function refresh(){
  const ticket=++generation.current;setBusy(true);setError('');
  try{
   const web3=await client();const [current]=await web3.eth.getAccounts();
   if(!current||current.toLowerCase()!==userAddress.toLowerCase())throw new Error('Подключите текущий аккаунт заново.');
   const currentGate=await readGate(web3,deployment.address,current);
   if(generation.current!==ticket)return;
   setGate(currentGate);await load(web3,ticket);
  }catch(e){if(generation.current===ticket){setGate(null);setError(errorText(e));}}
  finally{if(generation.current===ticket)setBusy(false);}
 }
 async function submit(event:React.FormEvent){
  event.preventDefault();if(!content.trim()||!tag.trim()){setError('Введите текст сообщения и тег.');return;}
  const ticket=++generation.current;setBusy(true);setError('');setTransaction('');
  try{
   const web3=await client();const [current]=await web3.eth.getAccounts();
   if(!current||current.toLowerCase()!==userAddress.toLowerCase())throw new Error('Аккаунт изменён. Подключите кошелёк заново.');
   const currentGate=await readGate(web3,deployment.address,current);
   if(generation.current!==ticket)return;
   setGate(currentGate);
   if(!currentGate.allowed){setStatus('Публикация недоступна: недостаточно токенов. Транзакция не отправлена.');return;}
   const contract=new web3.eth.Contract(posterAbi,deployment.address);
   await contract.methods.post(content.trim(),tag.trim()).call({from:current});
   if(generation.current!==ticket)return;
   setStatus('Подтвердите отправку в MetaMask.');
   await contract.methods.post(content.trim(),tag.trim()).send({from:current}).on('transactionHash',hash=>{
    if(generation.current===ticket){setTransaction(String(hash));setStatus('Транзакция отправлена. Ожидаем подтверждения…');}
   });
   if(generation.current!==ticket)return;
   setContent('');setTag('');setStatus('Сообщение записано в блокчейн. Обновляем список…');await load(web3,ticket);
  }catch(e){if(generation.current===ticket){setStatus('Публикация не завершена. Проверьте сообщение об ошибке и, если она отправлена, транзакцию.');setError(errorText(e));}}finally{if(generation.current===ticket)setBusy(false);}
 }
 const visible=filter===''?posts:posts.filter(p=>p.tagHash.toLowerCase()===hashTag(filter).toLowerCase());
 return <main>
  <header><div><p className="eyebrow">Лабораторная работа № 4 · Ethereum Sepolia</p><h1>Poster · доступ по токенам</h1><p>Публикация сообщений при достаточном балансе ERC-20</p></div><button onClick={connect} disabled={busy}>{userAddress?'Переподключить MetaMask':'Подключить MetaMask'}</button></header>
  <section aria-label="Подключение"><p><strong>Аккаунт:</strong> <span className="address">{userAddress||'не подключён'}</span></p>
   <p><strong>Контракт:</strong> {configured?<a className="address" href={`https://sepolia.etherscan.io/address/${deployment.address}#code`} target="_blank" rel="noreferrer">{deployment.address}</a>:'ещё не развёрнут / не настроен'}</p>
   <p role="status">{status}</p>{error&&<p role="alert" className="error">{error}</p>}
   {transaction&&<a href={`https://sepolia.etherscan.io/tx/${transaction}`} target="_blank" rel="noreferrer">Открыть отправленную транзакцию в Etherscan ↗</a>}
  </section>
  <section aria-label="Условия публикации"><h2>Доступ к публикации</h2>{gate?<>
   <p><strong>Токен из настроек Poster:</strong> <a className="address" href={`https://sepolia.etherscan.io/address/${gate.tokenAddress}`} target="_blank" rel="noreferrer">{gate.symbol} · {gate.tokenAddress}</a></p>
   <p><strong>Ваш баланс:</strong> {formatUnits(gate.balance,gate.decimals)} {gate.symbol}</p>
   <p><strong>Необходимый баланс:</strong> не менее {formatUnits(gate.threshold,gate.decimals)} {gate.symbol}</p>
   <p className={gate.allowed?'access-ok':'error'} role="status">{gate.allowed?'Публикация разрешена.':'Недостаточно токенов. Публикация недоступна, транзакция не будет отправлена.'}</p>
   <p className="hint">Токены при публикации не списываются. Баланс повторно проверяется перед отправкой.</p>
  </>:<p>Подключите кошелёк, чтобы прочитать настройки Poster и проверить баланс.</p>}
  <button className="secondary" onClick={refresh} disabled={busy||!userAddress||!configured}>Обновить баланс и условия</button></section>
  <section><h2>Новое сообщение</h2><form onSubmit={submit}>
   <label>Текст<textarea value={content} onChange={e=>setContent(e.target.value)} required rows={4} disabled={busy} placeholder="Привет! Это мой первый пост."/></label>
   <label>Тег<input value={tag} onChange={e=>setTag(e.target.value)} required disabled={busy} placeholder="hello"/></label>
   <p className="hint">Сообщение и тег будут публичными. Отправка требует комиссии в тестовых ETH.</p>
   <button type="submit" disabled={busy||!userAddress||!configured}>Опубликовать</button>
  </form></section>
  <section><div className="row"><h2>Сообщения <small>{visible.length} / {posts.length}</small></h2><button className="secondary" onClick={refresh} disabled={busy||!userAddress||!configured}>Обновить</button></div>
   <label>Фильтр по точному тегу<input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Оставьте пустым, чтобы показать все"/></label>
   {filter&&<button className="secondary" onClick={()=>setFilter('')}>Сбросить фильтр</button>}
   {!visible.length&&<p className="empty">{posts.length?'Сообщений с таким тегом нет.':'Сообщения появятся здесь после загрузки из блокчейна.'}</p>}
   {visible.map(post=><article key={post.id}><span className="tag">{post.tag===null?'Тег: '+post.tagHash:'#'+post.tag}</span><p className="content">{post.content}</p><p className="address">Автор: {post.author}</p>
    {post.tag===null&&<p className="hint">Текст тега недоступен в параметрах прямого вызова; показан хеш из события.</p>}
    <a href={`https://sepolia.etherscan.io/tx/${post.transactionHash}`} target="_blank" rel="noreferrer">Транзакция ↗</a>
   </article>)}
  </section>
 </main>;
}
