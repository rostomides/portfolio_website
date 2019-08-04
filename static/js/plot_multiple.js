// Initialize some variables
var currentTaxonMultipleSamples = '';


// -------------------------------------------------
// Populate liste of samples for multiple plotting
// --------------------------------------------------
function populate_list_sample_multiple_plotting(data) {

  var samples = '<div id="list-samples-multiple-selection">';

  data.forEach(function (item) {
    samples += '<div class="form-check">';
    samples += '<input type="checkbox" class="form-check-input  sample-checkbox" value="' + item + '">';
    samples += '<label class="form-check-label ">' + item + '</label>';
    samples += '</div>';
  });
  samples += '</div>';
  return samples;
}


// -------------------------------------------------
// Get list of selected samples
// --------------------------------------------------
function get_selected_samples_list() {
  // Get all selected samples
  var samples = []
  $('#multiple-samples-list .form-check').children().each(function () {
    if ($(this).prop('checked') == true) {
      samples.push($(this).val());
    }
  });

  // If no samples do nothing 
  if (samples.length < 2) {
    return 0
  }
  return samples;
}


// -------------------------------------------------
// Fetch data and draw the plot
// --------------------------------------------------
function fetch_data_and_create_plot(samples) {

  // Create taxonomy and update the plot        
  url = 'common_taxa_among_samples/' + samples.join(";");
  $.ajax({
    url: url,
    type: "GET",
    contentType: false,
    cache: false,
    processData: false,
    beforeSend: function () {
      $("#spinner-multiple-sample").show();
    },
    success: function (data) {
      if (data['status'] == 'success') {

        // Populate the taxonomy dropdowns
        var levels = ["Kingdom", "Phylum", "Class", "Order", "Family", "Genus", "Species"];
        $('#multiple-samples-taxonomy').empty();
        levels.forEach(function (tax) {
          $('#multiple-samples-taxonomy').append(data_to_dropdown(
            data['taxonomy'][tax],
            tax, 6,
            ["form-control", 'form-control-sm', "taxonomy-multiple", tax.toLowerCase()],
            'multiple-' + tax.toLowerCase()));
        });



        // If no current taxon, do nothing, else Generate the stacked plot
        if (currentTaxonMultipleSamples != '') {
          stacked_plot_several_samples(samples, currentTaxonMultipleSamples);
          multiple_samples_adjust_dropdowns(currentTaxonMultipleSamples);
        }

      } else {
        console.log("An unidentified error occured: One reason would be that the selected samples have zero counts for the selected taxon.");
      }
    },
    error: function (e) {
      // If any other non managed error
      $("#messages").html(e).fadeIn();
    },
    complete: function () {
      $("#spinner-multiple-sample").hide();
    }
  }); //ajax call

};


// -------------------------------------------------
// Stacked plot for several samples
// --------------------------------------------------

function stacked_plot_several_samples(samples, tax) {

  url = 'relative_abundance_of_several_samples/' + samples.join(";") + '/' + tax;
  $.ajax({
    url: url,
    type: "GET",
    contentType: false,
    cache: false,
    processData: false,
    beforeSend: function () {
      $("#spinner-multiple-sample").show();
    },
    success: function (data) {
      if (data['status'] == 'success') {
        // console.log(data);
        draw_stacked_plot(data, tax)

      } else {
        console.log("An unidentified error occured, please refresh your browser.");
      }
    },
    error: function (e) {
      // If any other non managed error
      $("#messages").html(e).fadeIn();
    },
    complete: function () {
      $("#spinner-multiple-sample").hide();
    }
  }); //ajax call
}


// --------------------------------------------------
// Function that adjusts the content of the dropdowns depending on the selected taxa (multiple samples)
// --------------------------------------------------
function multiple_samples_adjust_dropdowns(tax) {

  // Get the level of the taxon in order to target the right dropdown
  var lvl_tax = tax.split('; ').length - 1;
  var levels = ["Kingdom", "Phylum", "Class", "Order", "Family", "Genus", "Species"];
  current_id = 'multiple-' + levels[lvl_tax].toLocaleLowerCase();

  // Remove colors from all related taxa
  $('#multiple-samples-taxonomy select.taxonomy-multiple option').removeClass('tax-selected');

  // Set the rest of dropdowns to empty while coloring the associated taxa
  $('#multiple-samples-taxonomy select.taxonomy-multiple').each(function () {
    // If the id of the dropdown doesn't correspond to the current id, set its value to ''
    if ($(this).attr('id') != current_id) {
      $(this).val('');
      // Color all the related children that are contained in the taxon name or contain the taxon name
      $(this).children('option').each(function () {
        if (currentTaxonMultipleSamples.indexOf($(this).val()) == 0 || $(this).val().indexOf(currentTaxonMultipleSamples) == 0) {
          $(this).addClass('tax-selected');
        }
      });
    }
    else {
      // color the selected taxon
      $(this).children('option[value="' + currentTaxonMultipleSamples + '"]').addClass('tax-selected');
      $(this).val(currentTaxonMultipleSamples);
    }
  });

}


// --------------------------------------------------
// Function to Insert/update breadcrumbs in mutiple samples
// --------------------------------------------------
function add_breadcrumbs_multiple_samples(tax) {
  // Append a div for breadcrumbs
  $('#multiple-samples-plot').append('<div id="bread-crumbs-multiple-sampes"></div>');;
  taxonomy_breadcrumbs('multiple-samples-plot #bread-crumbs-multiple-sampes', tax);
}


// --------------------------------------------------
// Function to draw the stacked barplot
// --------------------------------------------------
function draw_stacked_plot(returnedData, tax) {
  $('#multiple-samples-plot').empty();

  // // Append a div for breadcrumbs
  // $('#multiple-samples-plot').append('<div id="bread-crumbs-multiple-sampes"></div>');;
  // taxonomy_breadcrumbs('multiple-samples-plot #bread-crumbs-multiple-sampes', tax);
  add_breadcrumbs_multiple_samples(tax);



  // Append a new canvas
  $('#multiple-samples-plot').append('<canvas id="stackedPlot" width="300px" height="200px" aria-label="Hello ARIA World" role="img"></canvas>');

  // Store the relevent results in a shorter variable to deal with
  var data = returnedData['taxonomy']

  // Generate color palette
  var backgroundColors = generate_colors(data['taxa'][0]);


  var barChartData = {
    labels: data['samples'],
    datasets: []
  }

  // Construct the data for the stacked plot
  for (var i = 0; i < data['taxa'][0].length; i++) {

    // Format the abundances 
    var abundance = []
    data['relative_abundance'].forEach(function (item) {
      abundance.push(item[i]);
    });

    // Generate readable labels
    var labels = data['taxa'][0].map(function (item) {
      var t = item.split("; ")
      return t[t.length - 1];
    });

    var dataset = {
      // label: data['taxa'][0][i],
      label: labels[i],
      backgroundColor: backgroundColors[i],
      data: abundance
    }

    // Add to the barchart data
    barChartData.datasets.push(dataset);

  }


  // Draw the plot
  var barplotctx = document.getElementById('stackedPlot').getContext('2d');
  window.myBar = new Chart(barplotctx, {
    type: 'bar',
    data: barChartData,
    options: {
      legend: {
        display: false,
        // position: 'right',
      },
      title: {
        display: true,
        text: 'Cumulative Relative Abundance'
      },
      tooltips: {
        mode: 'index',
        intersect: false
      },
      responsive: true,
      scales: {
        xAxes: [{
          stacked: true,
        }],
        yAxes: [{
          stacked: true
        }]
      }
    }
  });






}

