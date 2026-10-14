import {copyFileSync} from 'node:fs';
const stage=process.argv[2];
if(!['1','2'].includes(stage))throw Error('Use stage 1 or 2');
const root=new URL('../',import.meta.url);
for(const [src,dst] of [['Poster.sol.txt','contracts/Poster.sol'],['Poster.ts.txt','test/Poster.ts'],['poster-module.ts.txt','ignition/modules/poster.ts']])copyFileSync(new URL(`stages/${stage}/${src}`,root),new URL(`poster-contract/${dst}`,root));
console.log(`Stage ${stage} selected. Prepared contract, tests and module copied.`);
