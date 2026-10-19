import { useState } from 'react';
import Header from '../components/Header';
import Alerta from '../components/Alerta';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
export default function Perfil() {
 const { user, atualizarUser } = useAuth();
 const [dados,setDados] = useState({nome:user.nome || '',email:user.email || '',telefone:user.telefone || ''});
 const [senhas,setSenhas] = useState({senha_atual:'',nova_senha:'',confirmacao:''});
 const [mensagem,setMensagem] = useState(null);
 const [ocupado,setOcupado] = useState('');
 async function salvar(e, senha=false) {
  e.preventDefault(); setMensagem(null);
  if (senha && senhas.nova_senha !== senhas.confirmacao) { setMensagem({tipo:'erro',texto:'As novas senhas não coincidem.'}); return; }
  setOcupado(senha ? 'senha' : 'perfil');
  try {
   const {data} = await api.put(senha ? '/api/perfil/senha' : '/api/perfil', senha ? {senha_atual:senhas.senha_atual,nova_senha:senhas.nova_senha} : dados);
   atualizarUser(senha ? {token:data.token,trocar_senha:false} : data);
   if (senha) setSenhas({senha_atual:'',nova_senha:'',confirmacao:''});
   setMensagem({tipo:'sucesso',texto:senha ? 'Senha atualizada. As outras sessões foram encerradas.' : 'Seu perfil foi atualizado.'});
  } catch(e) { setMensagem({tipo:'erro',texto:e.response?.data?.erro || 'Não foi possível salvar. Tente novamente.'}); }
  finally {setOcupado('');}
 }
 return <div className="min-h-screen bg-graphite"><Header/><main id="conteudo" className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-7"><div className="page-heading"><span className="eyebrow">MINHA CONTA</span><h1>Seu perfil, do seu jeito.</h1><p>Mantenha seus contatos atualizados e cuide da segurança da sua conta.</p></div>{mensagem && <Alerta tipo={mensagem.tipo}>{mensagem.texto}</Alerta>}<div className="grid md:grid-cols-2 gap-6"><section className="surface-card p-6 sm:p-8"><span className="avatar avatar-large">{user.nome?.slice(0,1)}</span><h2 className="text-xl font-semibold mt-4">Informações pessoais</h2><p className="text-muted text-sm mt-2 mb-6">Código {user.codigo_acesso} · {user.tipo_usuario?.toLowerCase()}</p><form onSubmit={salvar} className="space-y-5">{[['nome','Nome completo','text'],['email','E-mail','email'],['telefone','Telefone','tel']].map(([key,label,type]) => <label key={key} className="field-label" htmlFor={key}>{label}<input id={key} className="field-input" type={type} value={dados[key]} required={key==='nome'} maxLength={key==='nome'?100:key==='email'?191:30} autoComplete={key==='nome'?'name':key==='telefone'?'tel':'email'} onChange={(e)=>setDados({...dados,[key]:e.target.value})}/></label>)}<button className="primary-button" disabled={Boolean(ocupado)}>{ocupado==='perfil'?'Salvando…':'Salvar alterações'}</button></form></section><section className="surface-card p-6 sm:p-8"><span className="eyebrow">SEGURANÇA</span><h2 className="text-xl font-semibold mt-3">Uma senha só sua.</h2><p className="text-muted text-sm mt-2 mb-6">Use pelo menos 8 caracteres, incluindo letras e números. Evite senhas usadas em outros serviços.</p><form onSubmit={(e)=>salvar(e,true)} className="space-y-5">{[['senha_atual','Senha atual'],['nova_senha','Nova senha'],['confirmacao','Confirme a nova senha']].map(([key,label])=><label key={key} className="field-label" htmlFor={key}>{label}<input id={key} className="field-input" type="password" required minLength={key==='senha_atual'?1:8} autoComplete={key==='senha_atual'?'current-password':'new-password'} value={senhas[key]} onChange={(e)=>setSenhas({...senhas,[key]:e.target.value})}/></label>)}<button className="primary-button" disabled={Boolean(ocupado)}>{ocupado==='senha'?'Atualizando…':'Atualizar senha'}</button></form></section></div></main></div>;
}
