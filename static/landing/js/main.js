$(document).ready(function () {

  // Activate the slider
  $('#slides').superslides({
    animation: "fade",
    play: 5000,
    pagination: false,
  });// Activate the slider



  // Typed js code
  var who = ["Bioinformatician.", "Data Scientist.", "Researcher.", "Language Enthusiast."];
  var typed = new Typed('.main-title .heading .sub-heading', {
    strings: who,
    typeSpeed: 70,
    loop: true,
    startDelay: 1000,
    showCursor: false,
  });// Typed js code 
 

  // Underline the corresponding link in the navbar when a section is reached
  // $(window).on("scroll", function () {

  //   var scrollHeight = $(document).height();
  //   var scrollPosition = $(window).height() + $(window).scrollTop();
    

  //   $("section").each(function () {
  //     id = $(this).attr('id')
  //     if (Math.round($(this).position().top) <= Math.round(scrollPosition) - ($(this).height() * 0.50)) {
  //       $('.nav-link').css("border-bottom", "none");
  //       $('.nav-link[href="#' + id + '"]').css("border-bottom", "1px solid #fff");

  //     } else {
  //       $('.nav-link[href="#' + id + '"]').css("border-bottom", "none");
  //     }      

  //   });

  // });



  // Smooth transition to the different section
  $('a.nav-link, #btn-top-page').click(function (e) {
    e.preventDefault();

    var targetElement = $(this).attr("href");
    var targetPosition = $(targetElement).offset().top;
    $("html, body").animate({ scrollTop: targetPosition - 50 }, "slow");

  });

  // // Number of publications 
  // const numpub = $(".publication").children("li").length;
  // $(".number-pub").text(numpub);


  // Get the current year for the copyright
  $('#year').text(new Date().getFullYear());



  // Nav link in new tab
  $(document).on('click', '.external-link', function (e) {
    e.preventDefault();
    var url = $(this).attr('href');
    window.open(url, '_blank');
  });

  $(".flip-card-front, .flip-card-back").on('click', function(){
    $(this).parent().toggleClass('rotated');    
  })

  $(".flip-card-front").one('mouseover', function(){
    $(this).parent().toggleClass('rotated');    
  })

  
  // Change the button label when publications are collapsed
  $('#collapsePublications').on('hidden.bs.collapse', function () {
    $('.btn-publications').text("See all")
  })

  $('#collapsePublications').on('shown.bs.collapse', function () {
    $('.btn-publications').text("Hide")
  })

  
  

  
  
  

});