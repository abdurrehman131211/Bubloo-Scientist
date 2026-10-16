"use strict";
window.StudioMedia={
 url(bucket,path){
  if(!['article-images','studio-avatars'].includes(bucket)||typeof path!=='string'||!/^[a-f0-9-]{36}\/[a-f0-9-]{36}\.(?:jpg|png|webp|gif)$/.test(path))return '';
  return window.SITE_CONFIG.supabaseUrl+'/storage/v1/object/public/'+bucket+'/'+path;
 },
 figure(image){
  const url=this.url('article-images',image.path);if(!url)return null;
  const figure=document.createElement('figure'),img=document.createElement('img');
  figure.className='article-picture';img.src=url;img.alt=typeof image.alt==='string'?image.alt:'';img.loading='lazy';figure.append(img);
  if(typeof image.caption==='string'&&image.caption){const caption=document.createElement('figcaption');caption.textContent=image.caption;figure.append(caption)}
  return figure;
 },
 render(container,body,images=[]){
  container.replaceChildren();const used=new Set(),valid=Array.isArray(images)?images.slice(0,12):[];
  const marker=/\[\[image:([a-f0-9-]{36})\]\]/g;let start=0,match;
  const paragraph=value=>{if(value.trim()){const p=document.createElement('p');p.style.whiteSpace='pre-wrap';p.textContent=value;container.append(p)}};
  while((match=marker.exec(body))){paragraph(body.slice(start,match.index));const image=valid.find(item=>item.id===match[1]);const figure=image&&this.figure(image);if(figure){container.append(figure);used.add(image.id)}start=marker.lastIndex}
  paragraph(body.slice(start));valid.forEach(image=>{if(!used.has(image.id)){const figure=this.figure(image);if(figure)container.append(figure)}});
 }
};
