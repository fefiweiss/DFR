# -*- coding: utf-8 -*-
import os 
import re

index = 0
with open('meta.csv') as input_file, open('meta_output.csv', 'w') as output_file:
    for linenum, line in enumerate(input_file, start=1):
    
        line = line.split(",")
        line[1] = line[1].replace("\n","")
        line = line[0] + "," + "\"" + line[1].replace("\"","") + "\"\n" 
        #print line 
        index += 1
        output_file.write(line)

input_file.close()
output_file.close()

os.remove("meta.csv")
os.rename('meta_output.csv', 'meta.csv')
       

        


#os.remove('meta.csv')
#os.rename('meta_output.csv', 'meta.csv')