# Diagnóstico de Problemas e Troubleshooting

**Documento:** `docs/TROUBLESHOOTING.md`  
**Data:** 03 de Outubro de 2026  

---

## 1. Problemas Comuns e Soluções

### 1.1 "Consumo Indevido (cStat 656)"
* **Causa:** O Web Service da SEFAZ detectou requisições repetidas sem intervalo mínimo de espera quando não há novos documentos a distribuir (`ultNSU == maxNSU`).
* **Solução:** A SEFAZ impõe um bloqueio temporário de **1 hora** por CNPJ/IP. A aplicação automaticamente reconhece o estado `RATE_LIMITED` e exibe o tempo restante para liberação. Aguarde o prazo expirar antes de tentar novamente.

### 1.2 "Nenhum certificado digital compatível foi encontrado nesta máquina"
* **Causa:** O repositório `Cert:\CurrentUser\My` do Windows não possui nenhum certificado com chave privada instalada.
* **Solução:**
  * Se for certificado **A1**: Dê dois cliques no arquivo `.pfx` no Windows e conclua a instalação marcando a opção "Repositório do Usuário Atual".
  * Se for certificado **A3**: Verifique se o token USB ou cartão inteligente está conectado e com o driver oficial do fabricante instalado.

### 1.3 "Certificado digital expirado"
* **Causa:** A data de validade (`valid_to`) do certificado ICP-Brasil foi ultrapassada.
* **Solução:** Renove o certificado digital junto à autoridade certificadora e vincule o novo certificado na barra lateral da aplicação.

### 1.4 "Falha de conexão com o Web Service da SEFAZ"
* **Causa:** Queda temporária de internet, instabilidade no Ambiente Nacional da SEFAZ ou bloqueio de firewall/proxy.
* **Solução:** Verifique o status dos serviços no Portal Nacional da NF-e (`nfe.fazenda.gov.br`) e confirme a conectividade à internet.
