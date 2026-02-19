import os

def delete_obj(folder):
    for f in os.listdir(folder):
        if f.endswith("_obj.csv"):
            os.remove(os.path.join(folder, f))
            print(f"Deleted {f}")

datasets = {"40-10", "60-20", "80-20", "100-25"}
algos = {"nsga2", "nsga3", "spea2", "moead", "nsacsad", "smoalns", "nsalns"}

for algo in algos:
    for data in datasets:
        folder = "data/" + data + "/" + algo + "/"
        delete_obj(folder)