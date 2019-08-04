
$(document).ready(function (e) {

    // Hide the Spinner when the page is loaded
    $('#spinner').hide();
    $('#spinner-single-sample').hide();
    $('#spinner-multiple-sample').hide();
    $('#spinner-predictions').hide();
    // Automatically disable the submit button to prevent any accidental submit without a file selected
    $('#upload-button').attr("disabled", true);

 

    // -----------------------------------------------------------
    // File selection and validation based on the extension
    // -----------------------------------------------------------
    $('#input_file').change(function (e) {
        // Validation of the type of input: making sure that the extension of the file is either csv or tsv
        const allowed_extensions = ["csv", 'tsv'];
        const errror_message_file_type = "Please provide a file with the following extensions: " + allowed_extensions.join(", ");
        const allowed_size = 2000000 // bites
        const errror_message_file_size = "The size of the file is too large for this Demo website, please provide a file with maximum size of 2MB";
        // Get the name of the file and its extension
        var file = e.target.files[0];
        ext = file.name.split(".");
        ext = ext[ext.length - 1];

        // define empty errors array
        var errors = [];

        $("#messages").empty();

        // Check if the filetype is allowed based on the file's extension
        if (!allowed_extensions.includes(ext.toLowerCase())) {
            errors.push(errror_message_file_type);
        }
        // Check if the size of the file
        if (file.size > allowed_size) {
            errors.push(errror_message_file_size);
        }
        // Check errors array if empty
        if (errors.length > 0) {
            $(this).css('border', 'solid 1px red')
            errors.forEach(function (item) {
                $("#messages").append('<li class="text-danger">' + item + '</li>');


            });
            $('#upload-button').attr('disabled', true);
        } else {
            $(this).css('border', 'solid 1px green')
            $('#upload-button').attr('disabled', false);
        }
    });

    // -----------------------------------------------------------
    // File upload using Ajax
    // -----------------------------------------------------------
    $("#form").submit(function (e) {
        // Empty all the results in case of submission of a new file
        empty_result_divs();


        e.preventDefault();
        $.ajax({
            url: $(this).attr('action'), // Get the url of the post request
            // url: '/file_upload/',
            type: "POST",
            data: new FormData(this), // Construct a form object
            contentType: false,
            cache: false,
            processData: false,
            headers: { "X-CSRFToken": $('meta[name=csrf-token]').attr('content') },
            beforeSend: function () {
                $("#spinner").show();
                $("#messages").empty();
            },
            success: function (data) {

                if (data['status'] == 'success') {

                    $('#main-element').css('display', 'block');

                    // If the submission status is success (see returned object from back-end)                    
                    $.each(data['messages'], function () {
                        $("#messages").append('<li class="text-success">' + data['messages'] + '</li>');
                    });

                    // Populate the samples drop-down
                    $('#samples-drop-down').empty();

                    $('#samples-drop-down').append(data_to_dropdown(data['samples'], 'Select a Sample', 12, ["form-control", 'form-control-sm', 'select'], 'select-sample'));

                    // Clear the input file field and disable the submit button
                    $('#input_file').val('');
                    $('#upload-button').attr("disabled", true);

                    // Populate the sample list for multiple samples plotting

                    $('#multiple-samples-list').empty()
                    $('#multiple-samples-list').append("<h5>Select Samples</h5>");
                    $('#multiple-samples-list').append(
                        populate_list_sample_multiple_plotting(data['samples'])
                    )
                    // Empty the taxonomy multiple samples if relevant
                    $('#multiple-samples-taxonomy').empty();

                    // Create the jumbotron in prediction section

                    $('#ibd-predictions').empty();
                    $('#ibd-predictions').append(create_disclaimer_message());

                } else {

                    // If the submission status is not success (see returned object from back-end)  
                    data['messages'].forEach(function (item) {
                        $("#messages").append('<li class="text-danger">' + item + '</li>');
                    })

                    // Clear the input file field and disable the submit button
                    $('#samples-drop-down').empty();
                    $('#input_file').val('');
                    $('#upload-button').attr("disabled", true);
                }
            },
            error: function (e) {
                // If any other non managed error
                $("#messages").html(e).fadeIn();
            },
            complete: function () {
                $("#spinner").hide();
            }
        }); //ajax call
    });


    // ------------------------------------------------------------------------
    // Change the values of taxonomy dropdown depending on the selected taxon
    // ------------------------------------------------------------------------
    $(document).on('change', "#taxonomy-drop-down select.taxonomy", function () {

        var tax = $(this).val();

        if (tax !== '') {
            change_taxonomy_dropdown_depending_on_taxon(tax);
        };

        // Change the color of selected taxa in the dropdowns
        color_taxons(tax, $(this).attr('id'));

        // Fetch the taxonomy
        var el = $("#samples-drop-down  #select-sample")
        fetch_taxon_by_sample(el.val());
        taxonomy_breadcrumbs('taxonomy-breadcrumbs', tax);


        $('#taxonomy-drop-down select.taxonomy').val("");
    });

    // -----------------------------------------------------------
    // Get taxonomy based on the selected sample
    // -----------------------------------------------------------    
    $(document).on('change', "#samples-drop-down", "#select-sample", function () {

        // Clear Chart and breadcrumbs and details of taxonomy if any        
        clear_chart();
        $('#taxonomy-breadcrumbs').empty();
        $('#additional_information').empty();

        var el = $("#samples-drop-down  #select-sample")

        url = 'taxonomy_by_sample_name/' + el.val();
        $.ajax({
            url: url,
            type: "GET",
            contentType: false,
            cache: false,
            processData: false,
            beforeSend: function () {
                $("#spinner-single-sample").show();
            },
            success: function (data) {
                if (data['status'] == 'success') {

                    // Populate the taxonomy dropdowns
                    var levels = ["Kingdom", "Phylum", "Class", "Order", "Family", "Genus", "Species"];
                    $('#taxonomy-drop-down').empty();
                    levels.forEach(function (tax) {
                        $('#taxonomy-drop-down').append(data_to_dropdown(
                            data['taxonomy'][tax],
                            tax, 2,
                            ["form-control", 'form-control-sm', "taxonomy", tax.toLowerCase()],
                            tax.toLowerCase()));
                    });

                } else {
                    console.log("An unidentified error occured, please refresh your browser.");
                }
            },
            error: function (e) {
                // If any other non managed error
                $("#messages").html(e).fadeIn();
            },
            complete: function () {
                $("#spinner-single-sample").hide();
            }
        }); //ajax call

    });


    // -----------------------------------------------------------
    // Hide the chart legend on small screens
    // -----------------------------------------------------------
    $(window).resize(function () {
        var width = $('#chart-container').width();
        if (width <= 300) {
            if (myNewChart) {
                myNewChart.options.legend.display = false;
                // myNewChart.options.legend.position = 'top';
                myNewChart.update();
            }
        } else {
            if (myNewChart) {
                myNewChart.options.legend.display = true;
                // myNewChart.options.legend.position = 'right';
                myNewChart.update();
            }
        }
    });


    // -------------------------------------------------
    // click on beradcrumbs updates the graph
    // -------------------------------------------------
    $(document).on('click', "#taxonomy-breadcrumbs .breadcrumb .breadcrumb-item a", function (e) {
        e.preventDefault();
        var tax = $(this).attr('tax');

        if (tax !== '') {
            change_taxonomy_dropdown_depending_on_taxon(tax);
        };

        // color_taxons(tax, $(this).attr('id'));

        // Fetch the taxonomy
        var el = $("#samples-drop-down  #select-sample")
        fetch_taxon_by_sample(el.val());
        taxonomy_breadcrumbs('taxonomy-breadcrumbs', tax);
        $('#taxonomy-drop-down select.taxonomy').val("");

    });


    // -------------------------------------------
    // Get OTU abundance from the select menu
    // -------------------------------------------
    $(document).on('change', '#otu-abundance', function () {

        $('#otu-relative-abundance').empty();
        if ($(this).val() != "") {
            var idxOtu = currentTaxon['abundance']['non_zero_otus_numbers'].indexOf(parseInt($(this).val()));
            var ra = currentTaxon['abundance']['non_zero_otus_abundance_global'][idxOtu];

            $('#otu-relative-abundance').append(
                '<p> Relative abundance: <span class="text-success">' + ra.toExponential(2) + '</span></p>');
        }

        // Clear the histogram
        clear_histogram();
        // Get the index of the otu in the labels
        var idxplot = myHistogram.data.labels.indexOf(parseInt($(this).val()));
        // Create a new colors array and change the color at the index of the otu of interest
        var backgroundColor = [];
        for (i = 0; i < myHistogram.data.labels.length; i++) {
            if (i == idxplot) {
                backgroundColor.push('#000');
            } else {
                backgroundColor.push('rgba(255, 99, 132, 1)');
            }
        }

        // Reset the hitogram
        var dataValues = currentTaxon['abundance']['non_zero_otus_abundance_global'];
        var dataLabels = currentTaxon['abundance']['non_zero_otus_numbers'];
        dataValues = dataValues.map(function (x) {
            return -1 / Math.log10(x); //Get a better representation of the relative abundance
        });
        draw_histogram(dataLabels, dataValues, backgroundColor);
    });



    // ############################################################################################################################
    // #################  PLOT MULTIPLE SAMPLES
    // ############################################################################################################################


    // -------------------------------------------
    // Handle multiple sample selection
    // Create dropdowns of taxonomic levels depending on the slected taxa
    // -------------------------------------------
    $(document).on('change', "#multiple-samples-list .sample-checkbox", function () {


        // Get all selected samples  
        var samples = get_selected_samples_list();
        if (samples == 0) {
            $('#multiple-samples-taxonomy').empty();
            currentTaxonMultipleSamples = '';

            $('#multiple-samples-plot').empty();
            $('#multiple-samples-plot').append('<p>Please select at least 2 samples and 1 taxon</p>');
            return
        }
        // Create/update the plot
        fetch_data_and_create_plot(samples);
    });


    // -----------------------------------------------------------
    // Change dropdown of taxonomy for myltiple samples
    // -----------------------------------------------------------
    $(document).on('change', '#multiple-samples-taxonomy select.taxonomy-multiple', function () {
        currentTaxonMultipleSamples = $(this).val();

        multiple_samples_adjust_dropdowns(currentTaxonMultipleSamples);

        // update or create the stacked plot
        var samples = get_selected_samples_list();
        // If no samples do nothing
        if (samples == 0) {
            return
        }

        // Generate the plot
        stacked_plot_several_samples(samples, currentTaxonMultipleSamples);
    });


    // -------------------------------------------------
    // click on beradcrumbs updates the graph of multiple samples 
    // -------------------------------------------------
    $(document).on('click', "#multiple-samples-plot .breadcrumb .breadcrumb-item a", function (e) {
        e.preventDefault();
        var tax = $(this).attr('tax');
        // Reset current TaxonMultipleSamples
        currentTaxonMultipleSamples = tax;

        // Get samples, fetch data and draw the plot
        var samples = get_selected_samples_list();
        fetch_data_and_create_plot(samples);
    });



    // Smooth transition to the different section
    $('#btn-top-page').click(function (e) {
        e.preventDefault();

        var targetElement = $(this).attr("href");
        var targetPosition = $(targetElement).offset().top;
        $("html, body").animate({ scrollTop: targetPosition - 50 }, "slow");

    });


    // Get the current year for the copyright
    $('#year').text(new Date().getFullYear());



    // ############################################################################################################################
    // #################  IBD prediction
    // ############################################################################################################################


    // --------------------------------------------------------------
    // Function that adds the disclaimer jumbotron to prediction tab
    // --------------------------------------------------------------

    function create_disclaimer_message() {

        var disclaimer_text = 'The results returned by this functionality can by no mean be used for diagnostic purposes. Larbi Bedrani is by no mean responsible of any outcome resulting from the use of the predictions to draw any medical decision. Get more information about how the model has been developed  <a id="ml-model-dev-link" class="modal-trigger" href="#" data-toggle="modal" data-target="#ml-model-dev">        here ...</a>';

       
        var jumbotron = '<div class="jumbotron mt-5"><div>';
        jumbotron += '<h3 class="display-5">Disclamer</h3>';

        jumbotron += '<p class="lead">' + disclaimer_text + '</p>';

        jumbotron += '<input type="checkbox" id="disclaimer-checkbox" name="scales"> <label for="scales">I have read and I understand the disclaimer</label>';

        jumbotron += '<br><button class="btn btn-info" id="predict-button" disabled>Make Predictions</button>';

        jumbotron += '</div></div>';

        return jumbotron
    }


    // --------------------------------------------------------------
    // Confirming the disclamer
    // --------------------------------------------------------------
    $(document).on('change', '#ibd-predictions #disclaimer-checkbox', function () {
        if ($(this).prop('checked')) {
            $('#predict-button').prop('disabled', false);
        } else {
            $('#predict-button').prop('disabled', true);
        }
    });


    // --------------------------------------------------------------
    // Perform prediction
    // --------------------------------------------------------------
    $(document).on('click', '#ibd-predictions #predict-button', function () {

        url = '/predict_ibd';
        $.ajax({
            url: url,
            type: "GET",
            contentType: false,
            cache: false,
            processData: false,
            beforeSend: function () {
                $("#spinner-predictions").show();
                $('#predict-button').prop('disabled', true);
            },
            success: function (data) {
                if (data['status'] == 'success') {

                    $('#ibd-display-predictions').empty();
                    $('#ibd-display-predictions').append(display_predictions(data['predictions']));

                } else {
                    console.log("An unidentified error occured, please refresh your browser.");
                }
            },
            error: function (e) {
                // If any other non managed error
                $("#messages").html(e).fadeIn();
                $('#disclaimer-checkbox').prop('checked', false);
            },
            complete: function () {
                $("#spinner-predictions").hide();
                $('#disclaimer-checkbox').prop('checked', false);
            }
        }); //ajax call

    });


    // --------------------------------------------------------------
    // Display predictions
    // --------------------------------------------------------------
    function display_predictions(data) {


        var html = '<div class="container">';


        for (var i = 0; i < data['samples'].length; i++) {

            var proba = Math.round(data['probabilities'][i] * 100);
            var cl = proba > 50 ? 'bg-danger' : 'bg-success';

            

            html += '<div class="text-center">' + data['samples'][i] + "</div>";
                
            html += '<div class="progress-container">'
                html += '<div class="progress">'
                    html += '<div class="progress-bar ' + cl + '" style="width:' + proba + '%">' + proba + '%</div>';
                html += '</div>';
            
            html += '</div>';            
        }


        html += '</div>';

        return html;
    }




    // ----------------------------------------------------
    // Create explanation modal
    // ----------------------------------------------------
    function generate_modal(title, body, id) {
        var html = '<div class="modal" id="' + id + '"><div class="modal-dialog"><div class="modal-content">';
        html += '<div class="modal-header">';
        html += '<h4 class="modal-title">' + title + '</h4>';
        html += '<button type="button" class="close" data-dismiss="modal">&times;</button></div>';
        html += '<div class="modal-body"><div class="container">' + body + '</div ></div >';
        html += '<div class="modal-footer"><button type="button" class="btn btn-danger" data-dismiss="modal">Close</button></div></div ></div ></div >';

        return html

    }

    // ---------------------------------------------------
    // Generate a modal
    // ---------------------------------------------------
    $(document).on('click', '.modal-trigger', function () {

        var target = $(this).attr('data-target');
        target = target.substr(1, target.length - 1);
        var id = $(this).attr('id');
        var title;
        var body;

        if (id == 'biom-gen-link') {

            title = "File Specifications";
            body = 'Biom Visualizer expects a file generated using the following steps:';
            body += '<ul class="p-4"><li>Create a biom file using your pipeline of choice using Greengenes as reference database</li><li>Convert the biom file into a tab separeted file. If you use the Qiime pipeline you can use the following command (<a>official website</a>): ';
            body += '<span class="command">biom convert -i your-biom-table.biom -o table.from_biom_w_taxonomy.txt --to-tsv --header-key taxonomy </span></li>';
            body += '<li>Please note that the taxonomy column must appear in your tsv file</li><li>Since this version of the app is a demo version, the file maximum size should not exceed 2MB.</li>';
            body += '<li>Download an example <a href="/example_file_download" id="download-example-file">here</a></li> </ul>';
        }

        if (id == 'ml-model-dev-link') {

            title = "Predictive model development steps";
            body = 'The predictive model has been developed using 16S sequencing data from 13 publically available studies on IBD. Then the following steps have been followed:';
            body += '<ul class="p-4"><li>OTU tables have been constructed using <a href="http://qiime.org/" target="_blank"> QIIME (v1.9)</a> using a closed reference OTU picking procedure against Greengenes database v13_0 (<a href="https://github.com/rostomides/Bioinformatics-pipelines/tree/master/Processing_public_datasets" target="_blank">see pipelines</a>)</li>';
            body += '<li>OTU tables have been rarefied. The rarefaction depth depended on the study but was never under 2000 reads</li>';
            body += '<li>All the OTU tables and their metadata have compiled into a single table that has been used to develop the predictive model. The data preprocessing and the machine learning tasks have been achieved using the python libraries: numpy, pandas, Scikit-learn, Xgboost, Catboost and keras for deep learning</li>';

            body += '<li>The model used in these prediction achieved an Area Under The ROC of 0.81 for binary calssification IBD vs NON IBD</li>';

            body += "<li>A more indepth model is currently in development and will hopefully classify non IBD vs Crohn's disease vs Ulcerative Colitis with high precision</li>";

           

            body += '</ul>'
        
        }

        $('#modal #' + target).modal('toggle');
        $('#modal').empty();
        $('#modal').append(generate_modal(title, body, target));
        $('#modal #' + target).modal('toggle');
    });

});


