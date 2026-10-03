package com.danielsoucristo.heroesvsmonsters;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.BufferedInputStream;
import java.io.ByteArrayOutputStream;
import java.io.FileInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import org.json.JSONObject;

/* ATUALIZADOR: duas formas de atualizar o jogo, sem abrir o navegador.
   1) APK novo (ícone, nome, permissões): versao(), baixar({url}), podeInstalar(), abrirPermissao(), instalar().
   2) NOVIDADES PELO SITE (personagens, ajustes): lerTexto({url}), prepararWeb({...}), usarWeb({caminho}), limparWeb({manter}).
      Baixa SÓ os arquivos que mudaram no site, monta uma pasta nova com o jogo inteiro (o resto é copiado do jogo atual)
      e passa a abrir o jogo por ela. Sem internet, o jogo continua abrindo pela última versão que já está no celular.
   Enquanto baixa, avisa o jogo pelo evento "progresso". */
@CapacitorPlugin(name = "Atualizador")
public class AtualizadorPlugin extends Plugin {

    private File arquivo() {
        File pasta = new File(getContext().getCacheDir(), "atualizacao");   // pasta do próprio jogo (não precisa de permissão)
        pasta.mkdirs();
        return new File(pasta, "heroes.apk");
    }

    // número da versão deste app (versionCode do android/app/build.gradle)
    @PluginMethod
    public void versao(PluginCall call) {
        try {
            PackageInfo pi = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0);
            long codigo = Build.VERSION.SDK_INT >= 28 ? pi.getLongVersionCode() : pi.versionCode;
            JSObject r = new JSObject();
            r.put("versionCode", codigo);
            r.put("versionName", pi.versionName);
            call.resolve(r);
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    // baixa o APK (segue os redirecionamentos do GitHub) e vai avisando a porcentagem
    @PluginMethod
    public void baixar(PluginCall call) {
        final String endereco = call.getString("url");
        if (endereco == null || endereco.isEmpty()) { call.reject("sem link do APK"); return; }
        new Thread(() -> {
            HttpURLConnection con = null;
            try {
                File destino = arquivo(), parte = new File(destino.getPath() + ".parte");
                URL u = new URL(endereco);
                for (int i = 0; i < 8; i++) {
                    con = (HttpURLConnection) u.openConnection();
                    con.setInstanceFollowRedirects(false);
                    con.setConnectTimeout(15000);
                    con.setReadTimeout(30000);
                    con.setRequestProperty("User-Agent", "HeroesVsMonsters");
                    int st = con.getResponseCode();
                    if (st >= 300 && st < 400) {
                        String para = con.getHeaderField("Location");
                        con.disconnect(); con = null;
                        u = new URL(u, para);
                        continue;
                    }
                    if (st != 200) throw new IOException("o servidor respondeu " + st);
                    break;
                }
                if (con == null) throw new IOException("muitos redirecionamentos");
                long total = con.getContentLengthLong(), baixado = 0, ultimoAviso = 0;
                try (InputStream in = new BufferedInputStream(con.getInputStream());
                     OutputStream out = new FileOutputStream(parte)) {
                    byte[] buf = new byte[65536];
                    int n;
                    while ((n = in.read(buf)) != -1) {
                        out.write(buf, 0, n);
                        baixado += n;
                        long agora = System.currentTimeMillis();
                        if (agora - ultimoAviso > 120) {
                            ultimoAviso = agora;
                            JSObject p = new JSObject(); p.put("baixado", baixado); p.put("total", total);
                            notifyListeners("progresso", p);
                        }
                    }
                }
                if (destino.exists()) destino.delete();
                if (!parte.renameTo(destino)) throw new IOException("não consegui salvar o arquivo");
                JSObject p = new JSObject(); p.put("baixado", baixado); p.put("total", total);
                notifyListeners("progresso", p);
                JSObject r = new JSObject(); r.put("tamanho", baixado);
                call.resolve(r);
            } catch (Exception e) {
                call.reject("Não deu para baixar: " + e.getMessage());
            } finally {
                if (con != null) con.disconnect();
            }
        }).start();
    }

    // o Android já deixa este jogo instalar atualizações?
    @PluginMethod
    public void podeInstalar(PluginCall call) {
        boolean pode = Build.VERSION.SDK_INT < 26 || getContext().getPackageManager().canRequestPackageInstalls();
        JSObject r = new JSObject(); r.put("pode", pode);
        call.resolve(r);
    }

    // abre a tela do Android "Permitir instalar apps desta fonte" (só na primeira vez)
    @PluginMethod
    public void abrirPermissao(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 26) {
            Intent i = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
        }
        call.resolve();
    }

    // abre a janela do Android "Deseja atualizar este app?"
    @PluginMethod
    public void instalar(PluginCall call) {
        try {
            File f = arquivo();
            if (!f.exists()) { call.reject("a atualização ainda não foi baixada"); return; }
            Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", f);
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setDataAndType(uri, "application/vnd.android.package-archive");
            i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
            call.resolve();
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    // ---------- 2) NOVIDADES PELO SITE ----------
    private static final String PREFS_WEBVIEW = "CapWebViewSettings", CHAVE_PASTA = "serverBasePath";   // as mesmas do Capacitor

    private HttpURLConnection abrir(String endereco) throws IOException {
        URL u = new URL(endereco);
        for (int i = 0; i < 8; i++) {
            HttpURLConnection con = (HttpURLConnection) u.openConnection();
            con.setInstanceFollowRedirects(false);
            con.setUseCaches(false);
            con.setConnectTimeout(15000);
            con.setReadTimeout(30000);
            con.setRequestProperty("User-Agent", "HeroesVsMonsters");
            con.setRequestProperty("Cache-Control", "no-cache");
            int st = con.getResponseCode();
            if (st >= 300 && st < 400) { String para = con.getHeaderField("Location"); con.disconnect(); u = new URL(u, para); continue; }
            if (st != 200) { con.disconnect(); throw new IOException("o servidor respondeu " + st + " para " + endereco); }
            return con;
        }
        throw new IOException("muitos redirecionamentos");
    }

    private static String codificar(String caminho) throws IOException {
        StringBuilder sb = new StringBuilder();
        for (String parte : caminho.split("/")) {
            if (sb.length() > 0) sb.append('/');
            sb.append(URLEncoder.encode(parte, "UTF-8").replace("+", "%20"));
        }
        return sb.toString();
    }

    private static void apagar(File f) {
        if (f == null || !f.exists()) return;
        File[] filhos = f.listFiles();
        if (filhos != null) for (File x : filhos) apagar(x);
        f.delete();
    }

    // lê um arquivo de texto da internet (ex.: versao-web.json do site), sem cache
    @PluginMethod
    public void lerTexto(PluginCall call) {
        final String endereco = call.getString("url");
        if (endereco == null) { call.reject("sem url"); return; }
        new Thread(() -> {
            HttpURLConnection con = null;
            try {
                con = abrir(endereco);
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                try (InputStream in = new BufferedInputStream(con.getInputStream())) {
                    byte[] buf = new byte[16384]; int n;
                    while ((n = in.read(buf)) != -1) out.write(buf, 0, n);
                }
                JSObject r = new JSObject(); r.put("texto", out.toString("UTF-8"));
                call.resolve(r);
            } catch (Exception e) {
                call.reject("Não deu para ler: " + e.getMessage());
            } finally { if (con != null) con.disconnect(); }
        }).start();
    }

    // monta a pasta da versão nova: baixa do site o que mudou ("b": true) e copia o resto do jogo atual
    // arquivos = [{ c: "caminho/arquivo", b: true|false, t: tamanho }]   base = pasta atual ("" = o jogo que veio no APK)
    @PluginMethod
    public void prepararWeb(PluginCall call) {
        final String site = call.getString("site"), pasta = call.getString("pasta"), base = call.getString("base", "");
        final JSArray lista = call.getArray("arquivos");
        if (site == null || pasta == null || lista == null) { call.reject("faltam dados"); return; }
        new Thread(() -> {
            File destino = new File(new File(getContext().getFilesDir(), "web"), pasta);
            try {
                apagar(destino);
                destino.mkdirs();
                String raiz = destino.getCanonicalPath();
                long total = 0, totalBaixar = 0;
                for (int i = 0; i < lista.length(); i++) {
                    JSONObject a = lista.getJSONObject(i);
                    total += a.optLong("t", 0);
                    if (a.optBoolean("b", false)) totalBaixar += a.optLong("t", 0);
                }
                long feito = 0, baixado = 0, ultimoAviso = 0;
                byte[] buf = new byte[65536];
                for (int i = 0; i < lista.length(); i++) {
                    JSONObject a = lista.getJSONObject(i);
                    String c = a.getString("c");
                    boolean doSite = a.optBoolean("b", false);
                    File saida = new File(destino, c);
                    if (!saida.getCanonicalPath().startsWith(raiz)) throw new IOException("caminho inválido: " + c);
                    saida.getParentFile().mkdirs();
                    HttpURLConnection con = null;
                    InputStream origem;
                    if (doSite) { con = abrir(site + "/" + codificar(c)); origem = con.getInputStream(); }
                    else if (base == null || base.isEmpty() || !base.startsWith("/")) origem = getContext().getAssets().open("public/" + c);
                    else origem = new FileInputStream(new File(base, c));
                    try (InputStream in = new BufferedInputStream(origem); OutputStream out = new FileOutputStream(saida)) {
                        int n;
                        while ((n = in.read(buf)) != -1) {
                            out.write(buf, 0, n);
                            feito += n; if (doSite) baixado += n;
                            long agora = System.currentTimeMillis();
                            if (agora - ultimoAviso > 120) {
                                ultimoAviso = agora;
                                JSObject p = new JSObject();
                                p.put("feito", feito); p.put("total", total); p.put("baixado", baixado); p.put("totalBaixar", totalBaixar);
                                notifyListeners("progresso", p);
                            }
                        }
                    } finally { if (con != null) con.disconnect(); }
                }
                JSObject r = new JSObject(); r.put("caminho", destino.getAbsolutePath());
                call.resolve(r);
            } catch (Exception e) {
                apagar(destino);
                call.reject("Não deu para atualizar: " + e.getMessage());
            }
        }).start();
    }

    // passa a abrir o jogo pela pasta nova (e guarda isso para as próximas vezes) — o jogo recarrega sozinho
    @PluginMethod
    public void usarWeb(PluginCall call) {
        final String caminho = call.getString("caminho");
        if (caminho == null || !new File(caminho, "index.html").exists()) { call.reject("pasta inválida"); return; }
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_WEBVIEW, Activity.MODE_PRIVATE);
        prefs.edit().putString(CHAVE_PASTA, caminho).apply();
        call.resolve();
        getActivity().runOnUiThread(() -> getBridge().setServerBasePath(caminho));
    }

    // apaga as versões antigas guardadas (deixa só a que está em uso)
    @PluginMethod
    public void limparWeb(PluginCall call) {
        final String manter = call.getString("manter", "");
        new Thread(() -> {
            File[] pastas = new File(getContext().getFilesDir(), "web").listFiles();
            if (pastas != null) for (File p : pastas) if (!p.getAbsolutePath().equals(manter)) apagar(p);
            call.resolve();
        }).start();
    }
}
