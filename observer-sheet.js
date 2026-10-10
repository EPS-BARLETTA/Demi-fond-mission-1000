/* Local A4 PDF: four observer cards, using the selected session's track. */
function observerCheckpoint(distance,lap){
 const nearest=Math.round(distance/lap),exact=Math.abs(distance-nearest*lap)<1e-7;
 const tours=exact?nearest:Math.floor(distance/lap),rest=exact?0:distance-tours*lap;
 const number=n=>String(Math.round(n*100)/100).replace('.',',');
 return {tours,rest,label:rest?`${tours} tours + ${number(rest)} m`:`${tours} tour${tours===1?'':'s'}`};
}
function observerPDF(lap){
 if(!Number.isFinite(lap)||lap<=0)throw Error('Longueur de piste à renseigner.');
 const num=n=>String(Math.round(n*100)/100).replace('.',',');
 const p500=observerCheckpoint(500,lap),p1000=observerCheckpoint(1000,lap);
 const commands=[],text=(x,y,t,size=10,bold=false)=>{
  // Standard PDF WinAnsi fonts: French accented letters are single bytes.
  const safe=t.replace(/[\u2019]/g,"'").replace(/[\u2013\u2014]/g,'-').replace(/[^\x20-\xff]/g,' ').replace(/[\\()]/g,'\\$&');
  commands.push(`BT /${bold?'F2':'F1'} ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${safe}) Tj ET`);
 },line=(x,y,x2,y2)=>commands.push(`${x} ${y} m ${x2} ${y2} l S`),rect=(x,y,w,h)=>commands.push(`${x} ${y} ${w} ${h} re S`);
 const cw=265,ch=388;
 for(let row=0;row<2;row++)for(let col=0;col<2;col++){
  const x=24+col*282,y=24+row*406,left=x+14,top=y+ch;
  commands.push('0 G 0 g 0.6 w');rect(x,y,cw,ch);
  text(left,top-27,'MISSION 1000',16,true);
  text(left,top-46,`OBSERVATEUR - PISTE : ${num(lap)} m`,10,true);
  text(left,top-72,'Coureur :',10,true);line(left+52,top-75,x+cw-14,top-75);
  text(left,top-97,'Observateur :',10,true);line(left+72,top-100,x+cw-14,top-100);
  text(left,top-121,'Classe : __________   Date : __________',10);
  const full=p1000.tours,group=Math.max(1,Math.ceil(full/20)),count=Math.ceil(full/group);
  text(left,top-136,group===1?'COCHE CHAQUE TOUR COMPLET':`COCHE CHAQUE GROUPE DE ${group} TOURS`,9,true);
  const columns=count<=10?5:10,step=237/columns,box=count<=10?22:17;
  for(let i=0;i<count;i++){
   const cx=left+step*(i%columns),cy=top-176-Math.floor(i/columns)*44;
   const end=Math.min((i+1)*group,full);
   text(cx+2,cy+box+4,String(end),count<=10?11:8,true);
   commands.push('0.9 w');rect(cx,cy,box,box);
  }
  if(!full)text(left,top-185,'Arrivée avant la fin du premier tour.',10);
  text(left,top-240,'500 m : '+p500.label,12,true);
  text(left,top-261,'Temps : ______ min ______ s',14,true);
  line(left,top-274,x+cw-14,top-274);
  text(left,top-294,'1000 m : '+p1000.label,12,true);
  text(left,top-315,'Temps : ______ min ______ s',14,true);
  if(p500.rest||p1000.rest){
   text(left,top-338,'Prof : placer les repères 500 m et 1000 m.',9,true);
   text(left,top-352,'Les mètres en plus se comptent après le départ.',8);
  }else text(left,top-345,'Les repères correspondent aux tours ci-dessus.',8);
  text(left,y+14,'Au passage 500 m, le chrono continue !',10,true);
 }
 const stream=commands.join('\n');
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
 let pdf='%PDF-1.4\n',offsets=[0];
 objects.forEach((o,i)=>{offsets.push(pdf.length);pdf+=`${i+1} 0 obj\n${o}\nendobj\n`});
 const xref=pdf.length;
 pdf+=`xref\n0 7\n0000000000 65535 f \n`+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
 return Uint8Array.from(pdf,c=>c.charCodeAt(0));
}
function downloadObserverSheet(lap){
 const url=URL.createObjectURL(new Blob([observerPDF(lap)],{type:'application/pdf'}));
 const a=document.createElement('a');a.href=url;a.download=`fiche-observateur-piste-${String(lap).replace('.','_')}m.pdf`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
