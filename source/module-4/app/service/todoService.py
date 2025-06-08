from flask import Flask, jsonify, json, Response, request
from flask_cors import CORS
import todoTableClient

app = Flask(__name__)
app.config['JSONIFY_PRETTYPRINT_REGULAR'] = False
CORS(app)

# 서비스 기본 경로에서 간단한 응답을 제공하여 헬스체크가 정상적으로 작동하도록 합니다.
@app.route("/")
def healthCheckResponse():
    return jsonify({"message" : "Nothing here, used for health check. Try /todos instead."})

# DynamoDB에서 모든 할일 목록을 가져옵니다.
@app.route("/todos", methods=['GET'])
def getTodos():
    serviceResponse = todoTableClient.getAllTodos()
    
    flaskResponse = Response(serviceResponse)
    flaskResponse.headers["Content-Type"] = "application/json"
    
    return flaskResponse

# 새로운 할일을 생성합니다.
@app.route("/todos", methods=['POST'])
def createTodo():
    requestBody = request.get_json()
    
    if not requestBody or 'text' not in requestBody:
        return jsonify({"error": "할일 텍스트가 필요합니다."}), 400
    
    serviceResponse = todoTableClient.createTodo(requestBody['text'])
    
    flaskResponse = Response(serviceResponse)
    flaskResponse.headers["Content-Type"] = "application/json"
    
    return flaskResponse

# 할일의 완료 상태를 토글합니다. (인증 필요)
@app.route("/todos/<todoId>/toggle", methods=['POST'])
def toggleTodo(todoId):
    # TODO: 인증 검증 로직 추가 예정
    serviceResponse = todoTableClient.toggleTodo(todoId)
    
    flaskResponse = Response(serviceResponse)
    flaskResponse.headers["Content-Type"] = "application/json"
    
    return flaskResponse

# 할일을 삭제합니다. (인증 필요)
@app.route("/todos/<todoId>", methods=['DELETE'])
def deleteTodo(todoId):
    # TODO: 인증 검증 로직 추가 예정
    serviceResponse = todoTableClient.deleteTodo(todoId)
    
    flaskResponse = Response(serviceResponse)
    flaskResponse.headers["Content-Type"] = "application/json"
    
    return flaskResponse

# 로컬 서버에서 서비스를 실행합니다. 포트 8080에서 수신 대기합니다.
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080) 