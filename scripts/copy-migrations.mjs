import {cp} from 'node:fs/promises';
await cp(new URL('../server/migrations',import.meta.url),new URL('../dist-server/server/migrations',import.meta.url),{recursive:true});
