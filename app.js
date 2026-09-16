const modal = document.querySelector('#loginModal');
const openModal = () => modal.classList.add('open');
const closeModal = () => modal.classList.remove('open');

document.querySelector('#loginOpen').addEventListener('click', openModal);
document.querySelector('#sideLogin').addEventListener('click', openModal);
document.querySelector('#loginClose').addEventListener('click', closeModal);
modal.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeModal(); });

const searchPanel = document.querySelector('#searchPanel');
document.querySelector('#searchToggle').addEventListener('click', () => {
  searchPanel.classList.add('open');
  searchPanel.querySelector('input').focus();
});
document.querySelector('#searchClose').addEventListener('click', () => searchPanel.classList.remove('open'));

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((item) => item.classList.remove('active'));
    tab.classList.add('active');
    const category = tab.dataset.filter;
    document.querySelectorAll('.post').forEach((post) => {
      post.style.display = category === 'all' || post.dataset.category === category ? 'grid' : 'none';
    });
  });
});

const toast = document.querySelector('#toast');
document.querySelector('#writeButton').addEventListener('click', () => {
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 2200);
});
