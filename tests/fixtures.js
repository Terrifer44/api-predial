// Adaptador exclusivamente para testes locais. Não substitui testes com MySQL.
const bcrypt = require('bcryptjs');
const senha = 'TesteLocal!2026';
const select = (row, fields) => !row ? null : fields ? Object.fromEntries(Object.keys(fields).filter(k => fields[k]).map(k => [k,row[k]])) : {...row};
function match(row, where = {}) {
  return Object.entries(where).every(([k,v]) => {
    if(k==='OR')return v.some(x=>match(row,x)); if(k==='AND')return v.every(x=>match(row,x));
    const atual=row[k];
    if(v && typeof v==='object' && !(v instanceof Date))return Object.entries(v).every(([op,x])=>op==='in'?x.includes(atual):op==='not'?atual!==x:op==='gt'?atual>x:op==='gte'?atual>=x:op==='lt'?atual<x:op==='contains'?String(atual).includes(x):false);
    return atual===v;
  });
}
function criarBancoTeste() {
  const agora = new Date();
  const usuarios = ['ADMINISTRADOR','MORADOR','OPERARIO','MORADOR','OPERARIO'].map((tipo,i)=>({id:i+1,nome:['Ana Gestão','Marina Costa','Carlos Silva','Outro Morador','Outro Operário'][i],codigo_acesso:['ADMIN001','MOR001','OPE001','MOR002','OPE002'][i],tipo_usuario:tipo,ativo:true,sessao_versao:0,senha_alterada_em:null,senha_hash:bcrypt.hashSync(senha,4),email:`teste${i}@example.invalid`,telefone:null,criado_em:agora,reset_token:null}));
  const demandas = [
    {id:1,setor:'HIDRAULICA',descricao:'Vazamento na torneira da área comum.',status:'PENDENTE',id_operario:null,urgencia_morador:'MEDIA'},
    {id:2,setor:'ELETRICA',descricao:'Iluminação do corredor do segundo andar.',status:'ATRIBUIDA',id_operario:3,urgencia_morador:'ALTA'},
    {id:3,setor:'ALVENARIA',descricao:'Reparo da parede do hall de entrada.',status:'CONCLUIDA',id_operario:3,urgencia_morador:'BAIXA'},
  ].map(d=>({...d,id_morador:2,criado_em:agora,atualizado_em:agora,foto_url:null,foto_public_id:null,sla_prazo:d.id===2?new Date(Date.now()+86400000):null,morador:{id:2,nome:'Marina Costa',email:'teste1@example.invalid'},operario:d.id_operario?{id:3,nome:'Carlos Silva'}:null}));
  const tabelas={usuario:usuarios,demanda:demandas,codigoLiberacao:[],historicoStatus:[],comentarioDemanda:[],notificacao:[]};
  const db={tabelas};
  for(const [nome,rows] of Object.entries(tabelas)) {
    const atualizar=(row,data)=>{for(const [k,v] of Object.entries(data))row[k]=v && typeof v==='object' && 'increment' in v ? (row[k]||0)+v.increment : v;return {...row};};
    db[nome]={
      async findUnique({where,select:campos}){return select(rows.find(r=>match(r,where)),campos);},
      async findMany({where,select:campos,skip=0,take=rows.length,orderBy}={}){let resultado=rows.filter(r=>match(r,where));if(orderBy){const [k,d]=Object.entries(orderBy)[0];resultado.sort((a,b)=>(a[k]>b[k]?1:a[k]<b[k]?-1:0)*(d==='desc'?-1:1));}return resultado.slice(skip,skip+take).map(r=>select(r,campos));},
      async count({where}={}){return rows.filter(r=>match(r,where)).length;},
      async create({data,select:campos}){const row={id:Math.max(0,...rows.map(r=>r.id))+1,criado_em:new Date(),sessao_versao:0,ativo:true,...data};rows.push(row);return select(row,campos);},
      async update({where,data,select:campos}){const row=rows.find(r=>match(r,where));if(!row)throw Object.assign(new Error('Missing'),{code:'P2025'});return select(atualizar(row,data),campos);},
      async updateMany({where,data}){const found=rows.filter(r=>match(r,where));found.forEach(r=>atualizar(r,data));return {count:found.length};},
      async delete({where}){const i=rows.findIndex(r=>match(r,where));if(i<0)throw Object.assign(new Error('Missing'),{code:'P2025'});return rows.splice(i,1)[0];},
      async deleteMany({where}){let count=0;for(let i=rows.length-1;i>=0;i--)if(match(rows[i],where)){rows.splice(i,1);count++;}return {count};},
    };
  }
  db.$transaction=async(fn)=>{const backup=structuredClone(tabelas);try{return await fn(db);}catch(e){for(const k of Object.keys(tabelas))tabelas[k].splice(0,tabelas[k].length,...backup[k]);throw e;}};
  db.$queryRaw=async()=>[{ok:1}];
  return db;
}
const emailTeste = Object.fromEntries(['enviarEmailRedefinicaoSenha','notificarAtribuicao','notificarInicioServico','notificarConclusaoServico','notificarImpedimento'].map(k=>[k,async()=>({enviado:false})]));
module.exports={criarBancoTeste,emailTeste,senha};
