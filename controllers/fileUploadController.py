import pandas as pd
import numpy as np
import os
import json
import re

from env import *
 
#  ML imports
import pickle
# from sklearn.tree import DecisionTreeClassifier
# from sklearn.linear_model import LogisticRegression
# from sklearn.svm import SVC
# from sklearn.ensemble import GradientBoostingClassifier
# from sklearn.linear_model import SGDClassifier
# from sklearn.linear_model import PassiveAggressiveClassifier
# from xgboost import XGBClassifier

from sklearn.ensemble import RandomForestClassifier
 
 
#############################################
# Validate the uploaded file
#############################################
# #Parsing the uploaded file
def validate_uploaded_file(path_to_file):
    errors = []
    #File must start by # Constructed from biom file
    with open(path_to_file) as f:
        first_line = next(f).strip()
        
        if first_line.strip() != "# Constructed from biom file":
            errors.append('First line must be: # Constructed from biom file ')   
    
        second_line = next(f).strip()
        
        # Second line mustbe at least 3 columns
        if len(second_line.split('\t')) < 3:
            errors.append('The file must contain at least 3 columns: #OTU ID, one or more samples, taxonomy')
        if second_line.split('\t')[0] != '#OTU ID':
            errors.append('First column must be: #OTU ID')
        if second_line.split('\t')[-1] != 'taxonomy':
            errors.append('Last column must be: taxonomy')

    if len(errors) > 0:
        return errors

    #Check the the type of data provided in very column
    data = pd.read_csv(path_to_file, skiprows=[0], sep="\t") 
    #Chech the #OTU ID are numeric
    numeric_columns = data.drop('taxonomy', axis=1).apply(lambda x: x.dtype == np.float64 or x.dtype == np.int64, axis=0)
    if not all(numeric_columns):
        errors.append("One or several sample columns contain non numeric values")
    
    # Check the format of the axonomy column
    pattern = re.compile(r'^k__.+; p__.+; c__.*; o__.*; f__.*; g__.*; s__.*$')
    taxonomy_check = data['taxonomy'].map(lambda x: 1 if re.match(pattern, x) is None else 0)
    
    if taxonomy_check.sum() > 0:    
        errors.append("The taxonomy layout doesn't follow the Greengenes pattern")   
    
    return errors    


#############################################
# Return the available  taxonomy by level
#############################################
def return_taxonomy_name(dataFrame):
    '''
    This function takes a data frame as argument
    it generates all the taxonomy levels available in the table for which the abundance is > 0
    return the taxonomy by level This will be used to populate thedropdown lists   
    '''    

    levels = ["Kingdom", "Phylum", "Class", "Order", "Family", "Genus", "Species"]
    taxonomy = {}


    for n_level in range(len(levels)):        
        taxonomy[levels[n_level]] = sorted(list( 
            set( 
                dataFrame.loc[:,"taxonomy"].apply(lambda x : "; ".join(x.split("; ")[:n_level + 1]))  
                )    
        ))
    
    return taxonomy


#############################################
# Return the names of the samples and the Taxonomy
#############################################
def return_sample_names(path_to_uploaded_file):
    '''
    This function returns the name of the samples available in the uploaded table
    The indecies of the samples in a typical file start at 1 and ends at len-2
    It also returns the taxonomy through the  'return_taxonomy_name' function
    '''
    data = pd.read_csv(path_to_uploaded_file, skiprows=[0], sep="\t")   

    # taxonomy = return_taxonomy_name(data) 
    return list(data.columns)[1:-1]

#############################################
# Get the taxonomy by sample
#############################################
def return_taxonomy_by_sample_name(path_to_uploaded_file, samples):
    '''
    This function returns the name of the samples available in the uploaded table
    The indecies of the samples in a typical file start at 1 and ends at len-2
    It also returns the taxonomy through the  'return_taxonomy_name' function
    '''
    data = pd.read_csv(path_to_uploaded_file, skiprows=[0], sep="\t") 

    #Check if only one sample has been sent a list of samples
    if not isinstance(samples, list):
        data = data[data[samples]>0] 
    elif (isinstance(samples, list) and len(samples) > 1):
        mask = data[samples].apply(lambda x: sum(x) > 0 , axis=1)
        data = data.loc[mask, :]

    # data = data[data[sample]>0]  

    
    taxonomy = return_taxonomy_name(data) 
    return taxonomy  




#####################################################################
# Return the abundance of a taxonomy level for a given sample
#####################################################################
def return_abundance_by_taxon_by_sample(path_to_uploaded_file, sample, level, taxon):
    '''
    This fuction takes the path of the uploaded file (stored in session in the main script).
    It reads the file then creates a columns with the taxa level depending on the n_level argument.
    Creating such column allows to perform groupby operations in order to calculate their abundances    
    '''
    levels = ["Kingdom", "Phylum", "Class", "Order", "Family", "Genus", "Species", "OTU"]

    data = pd.read_csv(path_to_uploaded_file, skiprows=[0], sep="\t")

    # Keep only the otus that are > 0
    data = data[data[sample]>0]
    
    # Get the index of the taxon level
    level_n = levels.index(level.capitalize())
    # Reformat the taxon_name
    taxon_n = taxon.replace(";", "; ")    

    # Create a copy of data 
    data_c = data.loc[:, ['#OTU ID', sample, 'taxonomy']] 


    # if the taxonomy is species =>return OTUs
    if level_n == len(levels) - 2 :
        data_c[levels[level_n]] = data_c.loc[:,"taxonomy"]
        data_c[levels[level_n + 1]] = data_c.loc[:,'#OTU ID'].map(lambda x: 'OTU_{}'.format(x))
    
    else:
        #Create a column that correspond to the given level
        #If we look for kingdom then the function must return the level after the kingdom =>phylum ...etc
        #we will create a column with the wanted level plus the level after that give the breakdown which will be used in the plot
        data_c[levels[level_n]] = data_c.loc[:,"taxonomy"].apply(lambda x : "; ".join(x.split("; ")[:level_n + 1])) 
        data_c[levels[level_n + 1]] = data_c.loc[:,"taxonomy"].apply(lambda x : "; ".join(x.split("; ")[:level_n + 2])) 
    
    
    #Calculate relative abundance of otus
    data_c['ra_global'] = data_c[sample].map(lambda x: x/sum(data_c[sample]))
    
    
    #Filter otus nased on the queried taxa level => we should have a data frame with only the otus belonging to the taxa we queried
    data_c = data_c.loc[data_c[levels[level_n]] == taxon_n , :]
    
    #Calculate relative abundance to parent
    #First let's calculate the sum of relative abundances of the taxa, if 0 we can' caculate the relative abundances with regard to parent
    sum_parent = sum(data_c['ra_global']) 
    
    data_c['ra_relative'] = data_c['ra_global'].map(lambda x: x/sum_parent)
    
    #Non zero otus
    non_zero = data_c.loc[ data_c[sample] > 0, ['#OTU ID', 'ra_global'] ].sort_values(by='ra_global', ascending=False)
    
    #Get relative abundances of
    re_global = data_c.groupby(levels[level_n + 1]).sum()
    
    data_return = {
        "main_taxon_level_number":  level_n,
        "main_taxon_level_name": levels[level_n],
        "main_taxon_name": taxon_n,
        "main_taxon_relative_abundance": data_c['ra_global'].sum(),
        "sample_name": sample,
        "non_zero_otus_numbers": list(non_zero['#OTU ID']),
        "non_zero_otus_abundance_global": list(non_zero['ra_global']),        
        "taxonomy_of_next_level":  list(re_global.index),
        "relative_abundances_next_level_global": list(re_global['ra_global']),
        "relative_abundances_next_level_realtive": list(re_global['ra_relative']),      
        }

    return data_return

   

#####################################################################
# Return taxonomy of several samples For stacked plot
#####################################################################
def return_taxonomy_of_several_samples(path_to_uploaded_file, samples, taxon):
    '''
    Return all the taxonomic level for which at least one sample has counts
    If the taxonomic level has no read for all the samples there is no value to show it   
    '''
    levels = ["Kingdom", "Phylum", "Class", "Order", "Family", "Genus", "Species", "OTU"]
    data = pd.read_csv(path_to_uploaded_file, skiprows=[0], sep="\t")

    # Convert samples from string to list
    samples_list = samples.split(";")

    #Filter data for OTU that have reads for at least one sample
    mask = data[samples_list].apply(lambda x: sum(x) > 0 , axis=1)
    data = data.loc[mask, :]

    #Detect the taxon level based on the number of ;
    level_n = len(taxon.split('; '))

    #Create a column with the desired level
    data[levels[level_n - 1 ]] = data['taxonomy'].map(lambda x: "; ".join(x.split('; ')[:level_n]))

    #Calculate relative abundance for the queried samples
    data[samples_list] = data[samples_list].apply(lambda x: x/sum(x), axis=0)

    #Filter the queried taxon only
    mask = data[levels[level_n - 1 ]] == taxon
    data = data.loc[mask, :]

    # Generate next level of taxonomy     
    if (level_n == len(levels) -1):
        data[levels[level_n]] = data['#OTU ID'].map(lambda x: "OTU_{}".format(x))
    else:
        data[levels[level_n]] = data['taxonomy'].map(lambda x: "; ".join(x.split('; ')[:level_n + 1]))  
     
    #Get relative abundance of every taxon in level + 1 for every queried sample
    relative_abundance_return = {
        "samples":[],
        "taxa":[],
        "relative_abundance":[]
    }   


    for sample in samples_list:
        grouped = data[[sample, levels[level_n]]].groupby(levels[level_n]).sum()

        relative_abundance_return["samples"].append(sample)
        relative_abundance_return["taxa"].append(list(grouped.index)) #Maybe use a set in the future!
        relative_abundance_return["relative_abundance"].append(list(grouped[sample]))
       

    
    return relative_abundance_return 



#####################################################################
# Return Prediction from trained model
#####################################################################
def return_ibd_prediction(path_to_uploaded_file):
    '''
    Return prediction from a previously trained model using sklearn   
    '''

    #Load models and the list of feaures
    model = pickle.load( open( MACHINE_LEARNING_PATH + "/zz_model_8_out_of_8.pickle", "rb" ) ) 
    model = model['RandomForestClassifier']['RandomForestClassifier_raw']['model_raw']
    features = pickle.load( open( MACHINE_LEARNING_PATH + "/Reference_list_of_features_to_be_used_in_website.pickle", "rb" ))

    # Load the otu table file
    otus = pd.read_csv(path_to_uploaded_file, skiprows=1, sep="\t")


    #Format the newly upladed otu table
    #Create columns for all taxonomic levels
    tax = ["kingdom","phylum", "class", "order", "family", "genus"]
    for i, v in enumerate(tax):
        otus[v] = otus['taxonomy'].map(lambda x: "; ".join(x.split("; ")[:i+1]))
        
    #Remove archea
    otus = otus[otus["kingdom"] == "k__Bacteria"]

    #Calculate Relative abundances
    #Function to calculate relative abundace by level
    def relative_abundance_by_level(data, level):
        rel = otus.groupby(level).sum()
        rel = rel.apply(lambda x : x/sum(x), axis=0)
        rel['taxon'] = rel.index
        
        return(rel)

    relative_abundance = [relative_abundance_by_level(otus, level) for level in tax]

    #Create table of relative abundances
    #Concatenate all the relative abundances of the different taxonomic levels
    relative_abundance =  pd.concat(relative_abundance, axis=0, ignore_index=True)
    relative_abundance.index = relative_abundance['taxon']
    relative_abundance.drop(['#OTU ID', 'taxon'], axis=1, inplace=True)

    #Transpose the table
    ra_transpose = relative_abundance.transpose()

    #filter the columns that exist in new file but not in the referesence features
    mask = ra_transpose.columns.map(lambda x: x in features.keys())
    ra_transpose = ra_transpose.loc[:, mask]

    #Add the missing columns and populate them with 0
    for col in features.keys():
        if not col in ra_transpose.columns:
            ra_transpose[col] = [0] * ra_transpose.shape[0]
    
    #Assign correct feature names
    ra_transpose.columns = ra_transpose.columns.map(features)

    #Make the prediction and return the object
    predictions = {
        'samples': list(ra_transpose.index),
        'probabilities': [x[1] for x in model.predict_proba(ra_transpose)]
    }

    return predictions