/* =====================================
Template Name: 	Appland
Author Name: Naimur Rahman
Author Url: www.themebazzar.com
Description: Appland - Creative App Landing HTML5 Template.
Version:	1.0
========================================*/     
/*=======================================
[Start Activation Code]
=========================================
	* Mobile Menu JS
	* Onepage Nav JS
	* Mobile slider JS
	* Hero Content Slider Slider JS
	* Extra Scroll JS
	* Typed JS
	* Testimonial Slider JS
	* Screenshorts Slider Js
	* Blog Slider JS
	* Clients Slider JS
	* Counter JS
	* Magnific Popup JS
	* Video Popup JS
	* Stellar JS
	* Wow JS JS
	* Scroll Up JS
	* Preloader JS
=========================================
[End Activation Code]
=========================================*/ 
(function($) {
    "use strict";
     $(document).on('ready', function() {
		
		jQuery(window).on('scroll', function() {
		if ($(this).scrollTop() > 100) {
			$('.header .main-menu').addClass("sticky");
		} else {
			$('.header .main-menu').removeClass("sticky");
		}
		});
		
		// Mobile Menu JS  //
		$('.mobile-menu').slicknav({
			prependTo:".mobile-nav",
		});
		
		/*====================================
			03. Onepage Nav JS
		======================================*/ 
		$('.menu').onePageNav({
			currentClass: 'active',
			changeHash: false,
			scrollSpeed: 1000,
			scrollThreshold: 0.5,
			filter: '',
			easing: 'easeInOutQuart',
			begin: function() {
				//I get fired when the animation is starting
			},
			end: function() {
				//I get fired when the animation is ending
			},
			scrollChange: function($currentListItem) {
				//I get fired when you enter a section and I pass the list item of the section
			}
		});
		
		//Mobile slider
		$('.mobile-slider')['owlCarousel']({
			loop: true,
			margin: 30,
			autoplay: true,
			dots: false,
			items: 1
		});
		var u = $(".mobile-slider"),
			p = $("#next"),
			m = $("#prev");
		p.on("click", function() {
			u.trigger("next.owl.carousel", [400])
		}); m.on("click", function() {
			u.trigger("prev.owl.carousel", [400])
		});
		
		// Hero Content Slider Slider JS  //
		$('.hero-content-slider').owlCarousel({
			autoplay:true,
			autoplayTimeout:4500,
			smartSpeed: 500,
			autoplayHoverPause:true,
			loop:true,
			merge:true,
			nav:true,
			dots:false,
			navText: ['<i class="fas fa-chevron-left"></i>', '<i class="fas fa-chevron-right"></i>'],
			responsive:{
				0: {
                    items: 1
                },
				300: {
					items:1,
				},
				480: {
					items:1,
				},
				1170: {
					items:1,
				}
			}
		});
		
		/*=======================
		  Extra Scroll JS
		=========================*/
		$('.scroll').on("click", function (e) {
			var anchor = $(this);
				$('html, body').stop().animate({
					scrollTop: $(anchor.attr('href')).offset().top - 0
				}, 900);
			e.preventDefault();
		});
		
		 //  9. typed
		var typed = $(".typed");
		$(function() {
			typed.typed({
				strings: ["Apple App Development.", "Android App.", "Windows Apps.", "App For Any Platform"],
				typeSpeed: 130,
				loop: true
			});
		});
		
		// Testimonial Slider JS  //
		$('.testimonial-slider').owlCarousel({
			autoplay:true,
			autoplayTimeout:3500,
			smartSpeed:300,
			autoplayHoverPause:true,
			loop:true,
			merge:true,
			nav:false,
			margin:30,
			dots:true,
			responsive:{
				0: {
                    items: 1
                },
				300: {
					items:1,
				},
				480: {
					items:2,
				},
				1170: {
					items:3,
				}
			}
		});
		
		// Screenshorts Slider Js  //
        $('.screen-carousel').owlCarousel({
            loop: true,
            navText: ['<i class="fas fa-chevron-left"></i>', '<i class="fas fa-chevron-right"></i>'],
            nav: true,
            autoplay: true,
            dots: false,
            autoplayTimeout: 5000,
            animateOut: 'fadeOut',
            animateIn: 'fadeIn',
            smartSpeed: 450,
            margin: 30,
            responsive: {
                0: {
                    items: 1
                },
                768: {
                    items: 3
                },
                991: {
                    items: 3
                },
                1200: {
                    items: 3
                },
                1920: {
                    items: 4
                }
            }
        });
		
		// Blog Slider JS  //
		$('.blog-slider').owlCarousel({
			autoplay:true,
			autoplayTimeout:3500,
			smartSpeed:300,
			autoplayHoverPause:true,
			loop:true,
			merge:true,
			nav:false,
			margin:30,
			dots:true,
			responsive:{
				0: {
                    items: 1
                },
				300: {
					items:1,
				},
				480: {
					items:2,
				},
				1170: {
					items:3,
				}
			}
		});
		
		// Clients Slider JS  //
		$('.clients-slider').owlCarousel({
			items:6,
			autoplay:true,
			autoplayTimeout:3500,
			margin:15,
			smartSpeed: 400,
			autoplayHoverPause:true,
			loop:true,
			nav:false,
			dots:false,
			responsive:{
				0: {
                    items: 1
                },
				300: {
					items:2,
				},
				480: {
					items:3,
				},
				768: {
					items:4,
				},
				1000: {
					items:6,
				}
			}
		});
		
		
		// Counter JS  //
		$('.counter').counterUp({
			delay: 15,
			time: 1000
		});

		// Magnific Popup JS  //
		$('.work-popup').magnificPopup({
			type: 'image',
			gallery:{
			enabled:true
			}
		});
		
		// Video Popup  //
		$('.video-popup').magnificPopup({
			type: 'video',	
		});
		
		// stellar //
		$.stellar({
		  horizontalOffset: 0,
		  verticalOffset: 0
		});
		
		
		/*====================================
			Wow JS
		======================================*/		
		var window_width = $(window).width();   
			if(window_width > 767){
            new WOW().init();
		}
		
		/*====================================
			14. Scroll Up JS
		======================================*/
		$.scrollUp({
			scrollText: '<span><i class="fa fa-angle-up"></i></span>',
			easingType: 'easeInOutExpo',
			scrollSpeed: 900,
			animation: 'fade'
		});  

	});
	
	/*************************/
    /*       PRELOADER       */
	/*************************/
	//After 2s preloader is fadeOut
	$('.preloader').delay(2000).fadeOut('slow');
	setTimeout(function() {
	//After 2s, the no-scroll class of the body will be removed
	$('body').removeClass('no-scroll');
	}, 2000); //Here you can change preloader time
	
})(jQuery);