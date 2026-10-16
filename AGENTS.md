# Trabalho neste projeto

O diretório principal é `D:\BACKUPS\APP REVENDA V2`.

Use o pnpm e preserve `pnpm-lock.yaml`. Antes de concluir mudanças de código, execute os testes pertinentes, lint e build.

O usuário solicitou manter as alterações concluídas no GitHub e publicar pela integração Git da Vercel. Ao concluir uma alteração solicitada, revise o diff, faça commit e envie para a branch de produção quando os testes passarem, respeitando instruções mais recentes do usuário. Informe se o envio ou a publicação falhar. Não trate arquivos apenas salvos localmente como backup remoto.

Antes de publicar, preserve no GitHub uma referência da versão anterior e registre a publicação correspondente da Vercel. Confirme o backup separado do banco e das fotos do Supabase; se não houver acesso administrativo ou uma cópia confirmada, informe a limitação e peça orientação antes da publicação. Backup do código não substitui backup do Supabase.

Nunca versione `.env.local`, segredos, tokens, logs, `node_modules`, `.next` ou `.vercel`. O banco e as fotos do Supabase não fazem parte do backup do código. Não execute migrações ou rotas que alterem os dados de produção como parte de testes de recuperação.
