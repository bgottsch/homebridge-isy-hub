
import websocket, ssl

def on_message(ws, message):
    print(message)

def on_error(ws, error):
    print(error)

def on_close(ws):
    print("### closed ###")


if __name__ == "__main__":
    websocket.enableTrace(True)

    headers = {
        'Authorization': 'Basic YmVubzpCYWxhZEA4MTI=',
        'Sec-WebSocket-Protocol': 'ISYSUB',
        'Sec-WebSocket-Version': '13',
        'Origin': 'com.universal-devices.websockets.isy'
    }

    ws = websocket.WebSocketApp("wss://10.0.1.64/rest/subscribe",
                              header=headers,
                              on_message = on_message,
                              on_error = on_error,
                              on_close = on_close)

    ws.run_forever(sslopt={"cert_reqs": ssl.CERT_NONE})