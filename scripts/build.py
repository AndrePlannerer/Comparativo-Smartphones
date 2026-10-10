#!/usr/bin/env python3
"""Normaliza data/raw/phones.jsonl -> data/phones.json e monta index.html.

Uso: python3 scripts/build.py [--artifact CAMINHO]
Sem dependências além da biblioteca padrão.
"""
import json, re, sys, pathlib, datetime

ROOT = pathlib.Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw" / "phones.jsonl"

USD_BRL = 5.25          # dólar comercial em 09/10/2026 (Asaas)
PRICE_DATE = "2026-10-10"

# Preços no Brasil. launch = preço oficial de lançamento (versão de entrada);
# now = menor preço encontrado pelo Oficina da Net em 10/2026 (inclui marketplaces).
BR = {
    "Apple|iPhone 18 Pro Max": (12999, 12999), "Apple|iPhone 18 Pro": (11999, 10799), "Apple|iPhone Duo": (21999, None),
    "Apple|iPhone 17 Pro Max": (12499, 9157), "Apple|iPhone 17 Pro": (11499, 7314), "Apple|iPhone Air": (10499, 6117),
    "Apple|iPhone 17": (7999, 5598), "Apple|iPhone 17e": (5800, 4049),
    "Samsung|Galaxy S26 Ultra": (11499, 7075), "Samsung|Galaxy S26+": (9199, 4999), "Samsung|Galaxy S26": (7499, 4118),
    "Samsung|Galaxy S26 FE": (5499, 5499), "Samsung|Galaxy Z Fold 8": (12599, 10529), "Samsung|Galaxy Z Fold 8 Ultra": (14599, 10787),
    "Samsung|Galaxy Z Flip 8": (9199, 6562), "Samsung|Galaxy A57 5G": (3599, 1619), "Samsung|Galaxy A37 5G": (3299, 1699),
    "Samsung|Galaxy A27 5G": (None, 1436), "Samsung|Galaxy A17 5G": (None, 861),
    "Motorola|Signature": (8999, 5129), "Motorola|Edge 70 Pro": (4499, 3403), "Motorola|Edge 70 Fusion": (2999, 2079),
    "Motorola|Razr 70 Ultra": (None, 11039), "Motorola|Moto G67": (None, 1181), "Motorola|Moto G17": (1499, 999),
    "Xiaomi|17T": (8700, 3587), "Xiaomi|17T Pro": (None, 4967), "Xiaomi|Redmi Note 17": (None, 1563),
    "Xiaomi|Redmi Note 17 Pro": (None, 2391), "Xiaomi|Redmi Note 15 Pro 5G": (None, 1931),
    "Poco|F9 Ultra": (None, 6439), "Poco|F9 Pro": (None, 4967), "Poco|X8 Pro Max": (None, 3149), "Poco|X8 Pro": (None, 2349),
    "Poco|X8": (None, 2023), "Poco|M8 Pro 5G": (None, 1747), "Poco|C85 5G": (None, 1080),
    "Realme|GT 8 Pro": (None, 5611), "Realme|16 Pro+": (None, 3599), "Realme|16": (None, 2999),
    "Oppo|Reno 16 F 5G": (None, 4231),
    "Vivo|X300 Ultra": (None, 15749), "Vivo|V70": (3499, 2744),
    "Infinix|GT 30 Pro": (None, 2254),
}
BR_NOTES = {
    "17T": "Preço oficial é o da versão de 512 GB; o menor preço atual vem de marketplaces.",
    "X300 Ultra": "Vendido no Brasil como Jovi X300 Ultra.",
    "V70": "Vendido no Brasil como Jovi V70.",
    "Razr 70 Ultra": "Nos EUA se chama Razr Ultra (2026).",
    "Galaxy S26+": "Ficha da versão Snapdragon, a vendida no Brasil.",
    "Galaxy S26": "Ficha da versão Snapdragon, a vendida no Brasil.",
}
USD_FIX = {  # preços em dólar que não vieram do NanoReview
    "Galaxy Z Fold 8": 1899, "Galaxy Z Fold 8 Ultra": 2099,  # SamMobile
    "Pixel 11 Pro Fold": 1899,                               # Droid Life
    "Pova 8 Pro 5G": None,                                   # valor da fonte parecia incoerente
}

BRANDS = {
 "Apple":    dict(br="Venda oficial ampla", br_lvl=3, forte="Desempenho, vídeo, valor de revenda e cerca de 7 anos de atualizações.", fraco="Preço oficial alto no Brasil, carregamento lento e nenhuma opção de entrada.", upd="≈7 anos"),
 "Samsung":  dict(br="Venda oficial ampla, fabricação local", br_lvl=3, forte="Maior variedade de faixas de preço, telas AMOLED e até 7 anos de atualizações.", fraco="Baterias e carregamento conservadores; preço de lançamento cai rápido.", upd="6 a 7 anos"),
 "Motorola": dict(br="Venda oficial ampla, fabricação local", br_lvl=3, forte="Bom preço de rua, Android limpo e resistência IP68/IP69 até nos baratos.", fraco="Poucos anos de atualização na linha Moto G.", upd="2 a 4 anos (7 na Signature 27)"),
 "Xiaomi":   dict(br="Venda oficial com preço alto; muita importação", br_lvl=2, forte="Muito hardware pelo preço, baterias enormes e carga de até 100 W.", fraco="Preço oficial no Brasil bem acima do importado; garantia depende do canal.", upd="2 a 6 anos"),
 "Poco":     dict(br="Submarca Xiaomi; maioria via importação", br_lvl=2, forte="Desempenho e bateria por real entre os melhores do mercado.", fraco="Câmeras medianas e atualização curta nos modelos baratos.", upd="2 a 5 anos"),
 "Realme":   dict(br="Venda oficial limitada", br_lvl=2, forte="Baterias de 7.000 mAh, carga rápida e IP69 em quase toda a linha.", fraco="Catálogo oficial pequeno no Brasil; desempenho modesto nos intermediários.", upd="2 a 5 anos"),
 "Google":   dict(br="Sem venda oficial no Brasil", br_lvl=0, forte="Câmera, Android puro e 7 anos de atualizações.", fraco="Desempenho abaixo dos rivais e sem garantia no Brasil.", upd="7 anos"),
 "OnePlus":  dict(br="Sem venda oficial no Brasil", br_lvl=0, forte="Bateria, carga rápida e desempenho de topo por preço menor.", fraco="Só por importação, sem garantia local.", upd="4 anos + 6 de segurança"),
 "Nothing":  dict(br="Sem venda oficial no Brasil", br_lvl=0, forte="Design próprio, software limpo e boas câmeras no intermediário.", fraco="Só por importação; desempenho mediano.", upd="3 a 5 anos"),
 "Honor":    dict(br="Venda oficial limitada", br_lvl=1, forte="Baterias de até 11.000 mAh, telas muito brilhantes e 7 anos na linha Magic.", fraco="Poucos modelos com preço no Brasil.", upd="2 a 7 anos"),
 "Oppo":     dict(br="Venda oficial limitada", br_lvl=1, forte="Câmeras da linha Find entre as melhores; IP69 e carga rápida.", fraco="Preço alto no Brasil e catálogo oficial curto.", upd="1 a 5 anos"),
 "Vivo":     dict(br="Vendida no Brasil como Jovi", br_lvl=1, forte="Câmeras com zoom forte, telas de ponta e bateria.", fraco="Catálogo pequeno no Brasil e topo de linha muito caro.", upd="4 a 5 anos"),
 "Infinix":  dict(br="Venda oficial limitada", br_lvl=1, forte="Preço baixo com tela AMOLED de 144 Hz e carga sem fio no intermediário.", fraco="Câmeras e desempenho simples; atualização curta.", upd="2 a 3 anos"),
 "Tecno":    dict(br="Presença pequena", br_lvl=1, forte="Preço baixo e bateria grande.", fraco="Política de atualização pouco clara e quase nada à venda no Brasil.", upd="Não informado"),
 "Asus":     dict(br="Linha parada desde 2025", br_lvl=1, forte="Desempenho gamer, fone P2 e tela de 185 Hz no ROG.", fraco="Só 2 anos de atualização e nenhum lançamento em 2026.", upd="2 anos"),
}

MONTHS = {m: i + 1 for i, m in enumerate(["January","February","March","April","May","June","July","August","September","October","November","December"])}


def slugify(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def split_name(raw):
    """-> (marca, modelo)"""
    n = raw["name"]
    if raw.get("brand") and not n.startswith(raw["brand"]):
        n = raw["brand"] + " " + n
    if n.startswith("Apple "):
        return "Apple", n[6:]
    if n.startswith("Samsung "):
        m = n[8:].replace(" (Snapdragon)", "").replace(" Plus", "+")
        return "Samsung", m
    if n.startswith("Xiaomi Poco "):
        return "Poco", n[12:]
    if n.startswith("Xiaomi "):
        return "Xiaomi", n[7:]
    if n.startswith("Motorola "):
        m = n[9:]
        if m == "Razr Ultra (2026)":
            m = "Razr 70 Ultra"
        return "Motorola", m
    if n.startswith("Realme "):
        return "Realme", n[7:].replace(" Pro Plus", " Pro+")
    if n.startswith("Google "):
        return "Google", n[7:]
    for b in ("OnePlus", "Nothing", "Honor", "Oppo", "Vivo", "Infinix", "Tecno", "Asus"):
        if n.startswith(b + " "):
            return b, n[len(b) + 1:]
    raise ValueError(n)


def released(s):
    if not s:
        return None
    m = re.match(r"(\d{4})-(\d{2})", s)
    if m:
        return f"{m.group(1)}-{m.group(2)}"
    a = s.split()
    return f"{a[1]}-{MONTHS[a[0]]:02d}"


def clean_chip(c):
    return re.sub(r"^(Qualcomm|MediaTek|Mediatek|Samsung|Google|Apple) ", "", c) if not c.startswith("Apple A") else c.replace("Apple ", "")


def lens_pt(l):
    l = re.sub(r"(\d)MP", r"\1 MP", l)
    for a, b in (("ultra-wide", "ultra-angular"), ("ultrawide", "ultra-angular"), ("telephoto", "tele"), ("standard", "principal"),
                 ("wide", "principal"), ("macro", "macro"), (" digital stabilization", ""), (" digital IS", "")):
        l = re.sub(r"(?<![a-zA-Z-])" + re.escape(a) + r"(?![a-zA-Z])", b, l)
    return l.strip()


def norm(raw):
    brand, model = split_name(raw)
    full = raw["name"] if not raw.get("brand") or raw["name"].startswith(raw["brand"]) else raw["brand"] + " " + raw["name"]
    slug = raw.get("slug") or slugify(full)
    launch, now = BR.get(f"{brand}|{model}", (None, None))
    usd = USD_FIX[model] if model in USD_FIX else raw.get("usd")
    lenses = [l for l in (raw.get("lenses") or []) if not re.match(r"(?i)^(depth|2MP depth|depth sensor)$", l.strip())]
    def lens_kind(l):
        l = l.lower()
        if "tele" in l: return "tele"
        if "ultra" in l: return "ultra"
        if "macro" in l: return "macro"
        return "main"
    kinds = [lens_kind(l) for l in lenses]
    tier = {"Flagship": "topo", "Mid-range": "inter", "Budget": "basico"}[raw["category"]]
    nfc = raw.get("nfc")
    p = dict(
        id=slug, brand=brand, model=model, name=("" if model.startswith(("iPhone", "Galaxy", "Pixel", "Moto ")) else brand + " ") + model,
        tier=tier, fold=raw.get("fold"), released=released(raw.get("released")),
        usd=usd, brl_launch=launch, brl_now=now, br_note=BR_NOTES.get(model),
        score=raw["score"],
        s=dict(tela=raw["s_display"], camera=raw["s_camera"], desempenho=raw["s_perf"], jogos=raw["s_gaming"], bateria=raw["s_battery"], conect=raw["s_conn"]),
        disp=dict(type=raw["disp_type"], inch=raw["disp_in"], res=(raw.get("res") or "").replace("x", " x ").replace("  ", " ").replace("  ", " "), ppi=round(raw["ppi"]) if raw.get("ppi") else None,
                  hz=raw["hz"], nits=raw.get("nits_hdr"), nits_test=raw.get("nits_test"), prot=raw.get("protection")),
        body=dict(h=raw["h_mm"], w=raw["w_mm"], t=raw["t_mm"], g=raw["g"], ip=raw.get("ip"), back=raw.get("back"), frame=raw.get("frame"), colors=raw.get("colors") or []),
        chip=clean_chip(raw["chip"]), nm=raw.get("nm"), gb6s=raw.get("gb6s"), gb6m=raw.get("gb6m"), antutu=raw.get("antutu"),
        ram=raw.get("ram_opts") or [], rom=raw.get("storage_opts") or [],
        rom_type=raw.get("storage_type"), sd=bool(raw.get("sd")),
        os=raw.get("os"), ui=raw.get("ui"), os_years=raw.get("os_years"), sec_years=raw.get("sec_years"),
        bat=dict(mah=raw["mah"], w=raw.get("w"), wl=raw.get("wireless_w") or 0, rev=bool(raw.get("reverse")), p30=raw.get("charge_30"), full=raw.get("full_min"), life=raw.get("life_h"), charger=raw.get("charger")),
        cam=dict(lenses=[lens_pt(l) for l in lenses], kinds=kinds, main=raw["main_mp"], sensor=raw.get("sensor_size"), ois=bool(raw.get("ois")), zoom=raw.get("zoom_x") if "tele" in kinds else None,
                 video=raw.get("video"), selfie=raw.get("selfie_mp"), dxo=raw.get("dxo")),
        con=dict(wifi=raw.get("wifi"), bt=str(raw.get("bt")) if raw.get("bt") else None, nfc=True if nfc is True else ("region" if nfc else (None if nfc is None else False)),
                 esim=bool(raw.get("esim")), g5=bool(raw.get("g5")), jack=bool(raw.get("jack")), stereo=bool(raw.get("stereo")), db=raw.get("loud_db")),
        src=f"https://nanoreview.net/en/phone/{slug}",
    )
    return p


def main():
    rows = [json.loads(l) for l in RAW.read_text().splitlines() if l.strip()]
    phones = []
    for r in rows:
        p = norm(r)
        # Política de atualização da Motorola no Brasil, segundo o Oficina da Net (a ficha de origem divergia).
        if (p["brand"], p["model"]) == ("Motorola", "Moto G67"):
            p["os_years"], p["sec_years"] = 2, None
        if (p["brand"], p["model"]) == ("Motorola", "Edge 70 Fusion"):
            p["os_years"], p["sec_years"] = 3, None
        if (p["brand"], p["model"]) == ("Infinix", "GT 30 Pro"):
            p["bat"]["wl"] = 30  # fonte indicava 50 W; a ficha do fabricante é 30 W
        phones.append(p)
    ids = [p["id"] for p in phones]
    assert len(ids) == len(set(ids)), "ids duplicados"
    for k in BR:
        assert any(f'{p["brand"]}|{p["model"]}' == k for p in phones), f"preço BR sem aparelho: {k}"
    data = dict(meta=dict(usd_brl=USD_BRL, price_date=PRICE_DATE, built=datetime.date.today().isoformat(), count=len(phones)),
                brands=BRANDS, phones=phones)
    (ROOT / "data" / "phones.json").write_text(json.dumps(data, ensure_ascii=False, indent=1))

    css = (ROOT / "src" / "styles.css").read_text()
    js = (ROOT / "src" / "app.js").read_text()
    body = (ROOT / "src" / "body.html").read_text()
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    fonts = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">'
    core = f"<title>Comparativo de Smartphones</title>\n{fonts}\n<style>\n{css}\n</style>\n{body}\n<script id=\"dados\" type=\"application/json\">{payload}</script>\n<script>\n{js}\n</script>\n"
    full = ("<!doctype html>\n<html lang=\"pt-BR\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\">\n"
            "<meta name=\"description\" content=\"Compare smartphones de 15 marcas: preços no Brasil e em dólar, notas por categoria, ficha técnica e custo-benefício.\">\n"
            + core.split("<style>")[0] + "<style>\n:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}\n"
            + core.split("<style>", 1)[1].split("</style>", 1)[0] + "</style>\n</head>\n<body>\n" + core.split("</style>", 1)[1] + "</body>\n</html>\n")
    (ROOT / "index.html").write_text(full)
    if "--artifact" in sys.argv:
        out = pathlib.Path(sys.argv[sys.argv.index("--artifact") + 1])
        out.write_text(core)
    print(f"{len(phones)} aparelhos, index.html {len(full)//1024} KB")


if __name__ == "__main__":
    main()
