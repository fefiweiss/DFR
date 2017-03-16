from gensim import corpora
from collections import defaultdict
from pprint import pprint
from gensim.models import ldamodel	
import numpy as np
import pandas as pd
import os
import json
from scipy.stats import entropy
from scipy.spatial.distance import pdist, squareform
from nltk.corpus import stopwords

model = ldamodel.LdaModel.load("lda_output/reclamos_lda")
dictionary = corpora.Dictionary.load('corpus_output/corpus_dict.dict')
corpus = corpora.BleiCorpus('corpus_output/corpus.lda-c')
n_topic = 10



index = 0
predict = model[corpus]

def get_doc_topic_dists(predict):
        doc_topic_dists = np.empty([len(corpus),n_topic]) 
        index = 0
        for topics in predict:
            for topic in topics:
        	   doc_topic_dists[index][topic[0]] = topic[1]
            index += 1
	np.savetxt('doc_topic.csv', doc_topic_dists, delimiter = ',' )
        return doc_topic_dists

def get_topic_term_dists(model):
	return model.state.get_lambda()

def get_doc_lengths(corpus):
	doc_lengths = []
	for document in corpus:
		doc_lengths.append(len(document))
	return doc_lengths

def get_coordinate_text(dataframe):
	x = dataframe['x']
	y = dataframe['y']

	file = open('topic_scaled.csv','w')

	for i in range(n_topic):
		file.write(str(x[i]) + "," + str(y[i]) )
		if i != (n_topic - 1):
			file.write("\n")

	file.close()




def _df_with_names(data, index_name, columns_name):
    if type(data) == pd.DataFrame:
          # we want our index to be numbered
          df = pd.DataFrame(data.values)
    else:
          df = pd.DataFrame(data)
    
    df.index.name = index_name
    df.columns.name = columns_name
    
    return df

def _series_with_name(data, name):
    if type(data) == pd.Series:
        data.name = name
        # ensures a numeric index
        return data.reset_index()[name]
    else:
        return pd.Series(data, name = name)

def _topic_coordinates(topic_term_dists, topic_proportion):
    K = topic_term_dists.shape[0]
    mds_res = js_PCoA(topic_term_dists)
    assert mds_res.shape == (K, 2)
    mds_df = pd.DataFrame({'x': mds_res[:,0], 'y': mds_res[:,1], 'topics': range(1, K + 1),  
                           'cluster': 1, 'Freq': topic_proportion * 100})
    # note: cluster (should?) be deprecated soon. See: https://github.com/cpsievert/LDAvis/issues/26
    return mds_df

def js_PCoA(distributions):
    """Dimension reduction via Jensen-Shannon Divergence & Principal Coordinate Analysis
    (aka Classical Multidimensional Scaling)
    Parameters
    ----------
    distributions : array-like, shape (`n_dists`, `k`)
        Matrix of distributions probabilities.
    Returns
    -------
    pcoa : array, shape (`n_dists`, 2)
    """
    dist_matrix = squareform(pdist(distributions, metric=_jensen_shannon))
    return _pcoa(dist_matrix)

def _pcoa(pair_dists, n_components=2):
    """Principal Coordinate Analysis,
    aka Classical Multidimensional Scaling
    """
    # code referenced from skbio.stats.ordination.pcoa
    # https://github.com/biocore/scikit-bio/blob/0.5.0/skbio/stats/ordination/_principal_coordinate_analysis.py

    # pairwise distance matrix is assumed symmetric
    pair_dists = np.asarray(pair_dists, np.float64)

    # perform SVD on double centred distance matrix
    n = pair_dists.shape[0]
    H = np.eye(n) - np.ones((n, n)) / n
    B = - H.dot(pair_dists ** 2).dot(H) / 2
    eigvals, eigvecs = np.linalg.eig(B)

    # Take first n_components of eigenvalues and eigenvectors
    # sorted in decreasing order
    ix = eigvals.argsort()[::-1][:n_components]
    eigvals = eigvals[ix]
    eigvecs = eigvecs[:, ix]

    # replace any remaining negative eigenvalues and associated eigenvectors with zeroes
    # at least 1 eigenvalue must be zero
    eigvals[np.isclose(eigvals, 0)] = 0
    if np.any(eigvals < 0):
        ix_neg = eigvals < 0
        eigvals[ix_neg] = np.zeros(eigvals[ix_neg].shape)
        eigvecs[:, ix_neg] = np.zeros(eigvecs[:, ix_neg].shape)

    return np.sqrt(eigvals) * eigvecs

def _jensen_shannon(_P, _Q):
    _M = 0.5 * (_P + _Q)
    return 0.5 * (entropy(_P, _M) + entropy(_Q, _M))



doc_topic_dists = get_doc_topic_dists(predict)
doc_topic_dists = np.genfromtxt('doc_topic.csv', delimiter = ',')
topic_term_dists = get_topic_term_dists(model)
doc_lengths = get_doc_lengths(corpus)



doc_topic_dists  = _df_with_names(doc_topic_dists, 'doc', 'topic')

doc_lengths      = _series_with_name(doc_lengths, 'doc_length')

topic_freq  = ((doc_topic_dists.T * doc_lengths).T).sum()

topic_proportion = (topic_freq / topic_freq.sum())


topic_coordinates = _topic_coordinates(topic_term_dists, topic_proportion)

get_coordinate_text(topic_coordinates)

print topic_coordinates













