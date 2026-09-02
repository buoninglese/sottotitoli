    (function(){
      function setDrawer(open){
        var s=document.querySelector('.sidebar');
        var b=document.getElementById('drawerBackdrop');
        if(s) s.classList.toggle('open', open);
        document.body.classList.toggle('drawer-open', open);
        if(b) b.classList.toggle('show', open);
      }
      window.toggleSidebarDrawer=function(){
        var s=document.querySelector('.sidebar');
        setDrawer(s ? !s.classList.contains('open') : false);
      };
      // Close the drawer on nav selection or backdrop tap
      document.addEventListener('click', function(e){
        if(e.target.closest('.sidebar .nav-item[data-panel]') || e.target.closest('.drawer-backdrop')){
          setDrawer(false);
        }
      });
    })();
