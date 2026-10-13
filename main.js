(function () {
  /* Welcome intro (home page only) */
  var welcome = document.getElementById('welcome');
  if (welcome) {
    var hideWelcome = function () {
      welcome.classList.add('done');
      setTimeout(function () { welcome.remove(); }, 900);
    };
    var autoHide = setTimeout(hideWelcome, 3600);
    welcome.addEventListener('click', function () {
      clearTimeout(autoHide);
      hideWelcome();
    });
  }

  /* Slow reveal on scroll */
  var items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    items.forEach(function (el) { observer.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('in'); });
  }
})();
