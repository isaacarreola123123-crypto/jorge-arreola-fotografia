
const categoryGrid = document.getElementById('categoryGrid');
const galleryArea = document.getElementById('galleryArea');
let currentImages = [];
let currentIndex = 0;

function prettyName(name){
  return name.replace(/\.(jpg|jpeg|png|webp)$/i,'')
    .replace(/[-_]+/g,' ')
    .replace(/\b\w/g,c=>c.toUpperCase());
}

function imageHTML(src, label, index){
  return `<button class="gallery-item" data-index="${index}" aria-label="Abrir fotografía">
    <img src="${src}" alt="${label}" loading="lazy">
  </button>`;
}

function renderCategories(){
  GALLERY_DATA.forEach((cat, i)=>{
    const firstGroup = Object.values(cat.groups)[0] || [];
    const cover = firstGroup[0] || 'assets/portada.jpg';
    const card = document.createElement('button');
    card.className='category-card';
    card.style.setProperty('--cover', `url("${cover}")`);
    card.innerHTML = `
      <span class="shutter" aria-hidden="true">
        <i></i><i></i><i></i><i></i><i></i><i></i>
      </span>
      <span class="category-info">
        <span class="category-number">0${i+1}</span>
        <span class="category-name">${cat.label}</span>
      </span>`;
    card.addEventListener('click',()=>openCategory(cat,card));
    categoryGrid.appendChild(card);
  });
}

function openCategory(cat, card){
  document.querySelectorAll('.category-card').forEach(c=>c.classList.remove('shutter-open'));
  card.classList.add('shutter-open');
  setTimeout(()=>{
    card.classList.remove('shutter-open');
    galleryArea.innerHTML='';
    const section=document.createElement('section');
    section.className='gallery-section active';
    section.id='galeria-'+cat.id;

    let html=`<div class="gallery-head">
      <div>
        <div class="section-kicker">PORTAFOLIO / ${cat.label}</div>
        <h3>${cat.label}</h3>
      </div>
      <button class="close-gallery">Cerrar ×</button>
    </div>`;

    let globalIndex=0;
    const entries=Object.entries(cat.groups);
    entries.forEach(([group, imgs])=>{
      html+=`<div class="subgallery">`;
      if(group && cat.id==='bodas'){
        html+=`<div class="subgallery-title"><span>${prettyName(group)}</span><span class="gallery-count">${imgs.length} fotografías</span></div>`;
      }
      html+=`<div class="masonry">`;
      imgs.forEach(src=>{
        html+=imageHTML(src, `${cat.label} — ${group ? prettyName(group) : 'Jorge Arreola Fotografía'}`, globalIndex);
        globalIndex++;
      });
      html+=`</div></div>`;
    });

    section.innerHTML=html;
    galleryArea.appendChild(section);

    currentImages=[...section.querySelectorAll('.gallery-item img')].map(img=>({src:img.src,alt:img.alt}));
    section.querySelectorAll('.gallery-item').forEach(btn=>{
      btn.addEventListener('click',()=>{
        currentIndex=Number(btn.dataset.index);
        showLightbox();
      });
    });
    section.querySelector('.close-gallery').addEventListener('click',()=>{
      section.classList.remove('active');
      setTimeout(()=>galleryArea.innerHTML='',500);
      card.scrollIntoView({behavior:'smooth',block:'center'});
    });

    section.scrollIntoView({behavior:'smooth',block:'start'});
  },520);
}

const lightbox=document.getElementById('lightbox');
const lightboxImage=document.getElementById('lightboxImage');
const lightboxCaption=document.getElementById('lightboxCaption');

function showLightbox(){
  if(!currentImages.length)return;
  const item=currentImages[currentIndex];
  lightboxImage.src=item.src;
  lightboxImage.alt=item.alt;
  lightboxCaption.textContent=`${currentIndex+1} / ${currentImages.length}  —  ${item.alt}`;
  lightbox.classList.add('open');
  lightbox.setAttribute('aria-hidden','false');
  document.body.classList.add('no-scroll');
}
function closeLightbox(){
  lightbox.classList.remove('open');
  lightbox.setAttribute('aria-hidden','true');
  document.body.classList.remove('no-scroll');
}
function nextImage(){currentIndex=(currentIndex+1)%currentImages.length;showLightbox()}
function prevImage(){currentIndex=(currentIndex-1+currentImages.length)%currentImages.length;showLightbox()}

document.getElementById('lightboxClose').addEventListener('click',closeLightbox);
document.getElementById('lightboxNext').addEventListener('click',nextImage);
document.getElementById('lightboxPrev').addEventListener('click',prevImage);
lightbox.addEventListener('click',e=>{if(e.target===lightbox)closeLightbox()});
document.addEventListener('keydown',e=>{
  if(!lightbox.classList.contains('open'))return;
  if(e.key==='Escape')closeLightbox();
  if(e.key==='ArrowRight')nextImage();
  if(e.key==='ArrowLeft')prevImage();
});

const glow=document.querySelector('.cursor-glow');
window.addEventListener('pointermove',e=>{
  glow.style.left=e.clientX+'px';
  glow.style.top=e.clientY+'px';
});

renderCategories();
