from sys import argv

from model_server.model_serverv2 import MyServer, load_model

if __name__ == "__main__":
    load_model(argv[1])
    print("Launching server on localhost, port:8000")
    MyServer("192.168.0.102", 8000).serve_forever()
