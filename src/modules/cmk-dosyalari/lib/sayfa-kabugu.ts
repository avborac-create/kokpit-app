// UDF/Word onizlemelerinin ortak "sayfa" davranisi (A4 sayfa gorunumu).
//  - Varsayilan: sayfa ekran genisligine ORANLI KUCULTULEREK sigdirilir (UYAP/PDF onizlemesi gibi;
//    yaslama, girinti, kenar bosluklari ayni kalir).
//  - Sag ustteki dugme "Metin modu"na gecer: sayfa kenarlari kalkar, metin ekrana gore akar, daha buyuk okunur.
// Betik yalniz bu belgenin kendi sayfa kutusunu olcekler; icerik sunucuda kacislanmis oldugundan
// betik disinda calistirilabilir kod yoktur (iframe ayrica CSP sandbox altindadir).

export const SAYFA_EK_CSS = `
.sayfa{max-width:none}
body.akici{padding:0;background:#fff}
body.akici .sayfa{width:auto;min-height:0;box-shadow:none;padding:14px 14px 28px!important}
body.akici p{text-align:left!important;text-indent:0!important;margin-left:0!important;tab-size:2;line-height:1.45}
#mod-dugme{position:fixed;top:8px;right:8px;z-index:5;border:0;border-radius:999px;padding:7px 14px;font:600 13px system-ui,sans-serif;background:rgba(10,132,255,.92);color:#fff}
@media (min-width:830px){#mod-dugme{display:none}}
`;

export const SAYFA_DUGME_VE_BETIK = `
<button id="mod-dugme" type="button">Metin modu</button>
<script>
(function(){
  var b=document.body,d=document.getElementById('mod-dugme'),SAYFA_PX=793.34;
  function sigdir(){
    if(b.classList.contains('akici')){b.style.zoom='';return;}
    var w=document.documentElement.clientWidth;
    b.style.zoom=w<SAYFA_PX+32?Math.max(0.3,(w-4)/(SAYFA_PX+0)):'';
    if(w<SAYFA_PX+32){b.style.padding='0';}else{b.style.padding='';}
  }
  d.addEventListener('click',function(){
    b.classList.toggle('akici');
    d.textContent=b.classList.contains('akici')?'Sayfa modu':'Metin modu';
    sigdir();
  });
  window.addEventListener('resize',sigdir);
  sigdir();
})();
</script>`;
