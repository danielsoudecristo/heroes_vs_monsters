/* Configuração do Vite (o "npm run dev").
   SALVAR_AJUSTES: o painel "Ajustar personagens" (embaixo do jogo) grava em public/assets/ajustes.json
   e este terminal mostra cada mudança, assim:   ✎ nick.velocidade: 34 → 40   */
import { defineConfig } from "vite";
import fs from "node:fs";
import path from "node:path";

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

export default defineConfig({
  plugins: [{
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
