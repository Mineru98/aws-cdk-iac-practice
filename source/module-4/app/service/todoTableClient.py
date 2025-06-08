import boto3
import json
import logging
from collections import defaultdict

# boto3를 사용하여 DynamoDB 클라이언트를 생성합니다. 
# boto3 라이브러리는 자동으로 ECS 태스크 역할과 연결된 자격 증명을 사용하여 
# DynamoDB와 통신하므로 코드에서 자격 증명을 저장/관리할 필요가 없습니다!
region = 'ap-northeast-2'
client = boto3.client('dynamodb', region_name=region)

def getAllTodos():
    # DynamoDB 스캔 작업을 사용하여 DynamoDB에서 모든 할일을 검색합니다.
    response = client.scan(
        TableName='TodoTable'
    )

    logging.info(response["Items"])

    # 반환된 할일들을 반복하고 프론트엔드에서 예상하는 JSON 응답 구조와 
    # 일치하는 새 딕셔너리에 속성을 추가합니다.
    todoList = defaultdict(list)
    for item in response["Items"]:
        todo = {}
        todo["id"] = int(item["id"]["N"])
        todo["text"] = item["text"]["S"]
        todo["completed"] = item["completed"]["BOOL"]
        todoList["todos"].append(todo)

    # 생성된 딕셔너리 목록을 JSON으로 변환합니다.
    return json.dumps(todoList)

def createTodo(text):
    # 새 할일의 ID를 생성하기 위해 현재 모든 할일을 가져와서 최대 ID를 찾습니다.
    response = client.scan(
        TableName='TodoTable',
        ProjectionExpression='id'
    )
    
    max_id = 0
    for item in response["Items"]:
        current_id = int(item["id"]["N"])
        if current_id > max_id:
            max_id = current_id
    
    new_id = max_id + 1
    
    # DynamoDB API PutItem을 사용하여 새 할일을 추가합니다.
    response = client.put_item(
        TableName='TodoTable',
        Item={
            'id': {'N': str(new_id)},
            'text': {'S': text},
            'completed': {'BOOL': False}
        }
    )
    
    # 새로 생성된 할일을 반환합니다.
    new_todo = {
        "id": new_id,
        "text": text,
        "completed": False
    }
    
    return json.dumps(new_todo)

def toggleTodo(todo_id):
    # 먼저 현재 할일의 완료 상태를 가져옵니다.
    response = client.get_item(
        TableName='TodoTable',
        Key={
            'id': {'N': str(todo_id)}
        }
    )
    
    if 'Item' not in response:
        error_response = {"error": "할일을 찾을 수 없습니다."}
        return json.dumps(error_response)
    
    current_completed = response['Item']['completed']['BOOL']
    new_completed = not current_completed
    
    # DynamoDB API UpdateItem을 사용하여 완료 상태를 토글합니다.
    response = client.update_item(
        TableName='TodoTable',
        Key={
            'id': {'N': str(todo_id)}
        },
        UpdateExpression="SET completed = :c",
        ExpressionAttributeValues={':c': {'BOOL': new_completed}}
    )
    
    success_response = {"message": "할일 상태가 업데이트되었습니다.", "completed": new_completed}
    return json.dumps(success_response)

def deleteTodo(todo_id):
    # DynamoDB API DeleteItem을 사용하여 할일을 삭제합니다.
    response = client.delete_item(
        TableName='TodoTable',
        Key={
            'id': {'N': str(todo_id)}
        }
    )
    
    success_response = {"message": "할일이 삭제되었습니다."}
    return json.dumps(success_response) 