import os
os.environ["ANONYMIZED_TELEMETRY"] = "False"

# АКО ИМАШ ПРОБЛЕМ: Размаркирай долния ред. 
# "0" обикновено е мощната карта, но при някои лаптопи е "1". Пробвай и с двете.
# os.environ["CUDA_VISIBLE_DEVICES"] = "0" 

import torch
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

CHROMA_PATH = "data/chroma_db"
os.makedirs(CHROMA_PATH, exist_ok=True)

device = "cpu"
if torch.cuda.is_available():
    # Ако имаш 2 карти (напр. cuda:0 и cuda:1), можеш директно да хардкоднеш "cuda:0" или "cuda:1" тук
    device = "cuda"
elif torch.backends.mps.is_available():
    device = "mps"

print(f"Инициализация на модел с устройство: {device.upper()}")

# Дебъг: Да видим коя точно карта ползваме!
if device.startswith("cuda"):
    print(f"Използвана видеокарта: {torch.cuda.get_device_name(device)}")

embedding_model = HuggingFaceEmbeddings(
    model_name="BAAI/bge-m3",
    model_kwargs={'device': device},
    encode_kwargs={'normalize_embeddings': True}
)


def add_chunks_to_vector_db(chunks):
    if not chunks:
        return False
    
    db = Chroma(
        persist_directory=CHROMA_PATH,
        embedding_function=embedding_model,
        collection_name="diploma_documents"
    )

    db.add_documents(chunks)

    return True