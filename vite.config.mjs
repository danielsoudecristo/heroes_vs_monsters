/* Configuração do Vite (o "npm run dev").
   SALVAR_AJUSTES: o painel "Ajustar personagens" (embaixo do jogo) grava em public/assets/ajustes.json
   e este terminal mostra cada mudança, assim:   ✎ nick.velocidade: 34 → 40   */
import { defineConfig } from "vite";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ARQUIVO = path.resolve("public/assets/ajustes.json");

function mudancas(antes, depois, prefixo = "") {          // lista o que mudou entre o arquivo velho e o novo
  const linhas = [];
  for (const k of Object.keys(depois || {})) {
    const a = antes ? antes[k] : undefined, d = depois[k];
    if (d && typeof d === "object") linhas.push(...mudancas(a, d, prefixo ? prefixo + "." + k : k));
    else if (a !== d) linhas.push(`  \x1b[33m✎\x1b[0m ${prefixo ? prefixo.split(".").pop() + "." : ""}${k}: ${a ?? "-"} \x1b[36m→\x1b[0m \x1b[32m${d}\x1b[0m`);
  }
  return linhas;
}

/* VERSAO_WEB: no "npm run build", cria dist/versao-web.json com a lista de TODOS os arquivos do jogo
   (um código de cada arquivo + tamanho). O app compara com o que ele tem e baixa do site SÓ o que mudou.
   "versao" = data e hora do build (sempre sobe sozinha, você não precisa mudar número nenhum).
   "apk" = versionCode do android/app/build.gradle: app com APK mais velho que isso espera atualizar o APK. */
function versaoWeb() {
  let saida = path.resolve("dist");
  return {
    name: "versao-web",
    apply: "build",
    configResolved(c) { saida = path.resolve(c.root, c.build.outDir); },
    closeBundle() {
      const arquivos = {};
      const andar = (pasta, rel) => {
        for (const nome of fs.readdirSync(pasta)) {
          const p = path.join(pasta, nome), r = rel ? rel + "/" + nome : nome, st = fs.statSync(p);
          if (st.isDirectory()) andar(p, r);
          else if (r !== "versao-web.json") arquivos[r] = { h: crypto.createHash("sha1").update(fs.readFileSync(p)).digest("hex").slice(0, 16), t: st.size };
        }
      };
      andar(saida, "");
      let apk = 0;
      try { const m = fs.readFileSync(path.resolve("android/app/build.gradle"), "utf8").match(/versionCode\s+(\d+)/); if (m) apk = Number(m[1]); } catch {}
      const versao = Math.floor(Date.now() / 1000);
      fs.writeFileSync(path.join(saida, "versao-web.json"), JSON.stringify({ versao, apk, arquivos }));
      console.log(`\x1b[35m[versao-web]\x1b[0m ${Object.keys(arquivos).length} arquivos · versão ${versao} · APK mínimo ${apk}`);
    }
  };
}

export default defineConfig({
  plugins: [versaoWeb(), {
    name: "salvar-ajustes",
    configureServer(server) {
      server.middlewares.use("/salvar-ajustes", (req, res) => {
        if (req.method !== "POST") { res.statusCode = 405; res.end("use POST"); return; }
        let corpo = "";
        req.on("data", parte => { corpo += parte; });
        req.on("end", () => {
          try {
            const novo = JSON.parse(corpo);                 // só grava se for um JSON certinho
            let velho = null;
            try { velho = JSON.parse(fs.readFileSync(ARQUIVO, "utf8")); } catch {}
            fs.writeFileSync(ARQUIVO, corpo, "utf8");
            if (!velho) { console.log("\x1b[35m[ajustes]\x1b[0m criei public/assets/ajustes.json"); res.end("ok"); return; }
            const linhas = mudancas(velho, novo);
            if (linhas.length) console.log(`\x1b[35m[ajustes]\x1b[0m public/assets/ajustes.json\n` + linhas.join("\n"));
            res.end("ok");
          } catch (e) { res.statusCode = 400; res.end("erro: " + e.message); }
        });
      });
    }
  }]
});
