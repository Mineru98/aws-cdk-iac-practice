// API 엔드포인트 설정 - NLB 주소로 교체하세요
var todosApiEndpoint = 'REPLACE_ME'; // 예시: 'http://TodoLi-Servi-XXXXXXXXXX-XXXXXXXX.elb.ap-northeast-2.amazonaws.com'

// DOM 요소
const todoForm = document.getElementById("todo-form")
const todoInput = document.getElementById("todo-input")
const todoList = document.getElementById("todo-list")
const loadingMessage = document.getElementById("loading-message")
const emptyMessage = document.getElementById("empty-message")
const errorMessage = document.getElementById("error-message")
const todoItemTemplate = document.getElementById("todo-item-template")
const todoEditTemplate = document.getElementById("todo-edit-template")

// 상태 관리
let todos = []

// 초기화
document.addEventListener("DOMContentLoaded", () => {
  loadTodos()
  todoForm.addEventListener("submit", handleAddTodo)
})

// 할 일 목록 로드
async function loadTodos() {
  try {
    showLoading(true)
    hideError()
    
    if (!todosApiEndpoint || todosApiEndpoint === 'REPLACE_ME') {
      throw new Error('API 엔드포인트가 설정되지 않았습니다. todosApiEndpoint를 NLB 주소로 변경해주세요.')
    }

    const response = await fetch(todosApiEndpoint + '/todos')
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    todos = await response.json()
    console.log('DynamoDB에서 로드된 할 일 목록:', todos)
  } catch (error) {
    console.error("할 일 목록 로드 오류:", error)
    showError('데이터를 불러오는 중 오류가 발생했습니다: ' + error.message)
    todos = []
  } finally {
    showLoading(false)
    renderTodos()
  }
}

// 로딩 상태 표시
function showLoading(show) {
  if (show) {
    loadingMessage.classList.remove("hidden")
  } else {
    loadingMessage.classList.add("hidden")
  }
}

// 오류 메시지 표시
function showError(message) {
  errorMessage.textContent = message
  errorMessage.classList.remove("hidden")
}

// 오류 메시지 숨기기
function hideError() {
  errorMessage.classList.add("hidden")
}

// 할 일 목록 렌더링
function renderTodos() {
  // 목록 초기화
  todoList.innerHTML = ""

  // 할 일이 없는 경우
  if (todos.length === 0) {
    emptyMessage.classList.remove("hidden")
    return
  }

  // 할 일이 있는 경우
  emptyMessage.classList.add("hidden")

  // 할 일 항목 렌더링
  todos.forEach((todo) => {
    const todoItem = createTodoItem(todo)
    todoList.appendChild(todoItem)
  })
}

// 할 일 항목 생성
function createTodoItem(todo) {
  const template = todoItemTemplate.content.cloneNode(true)
  const todoItem = template.querySelector(".todo-item")

  // ID 설정
  todoItem.dataset.id = todo.id

  // 체크박스 설정
  const checkbox = todoItem.querySelector(".todo-checkbox")
  checkbox.checked = todo.completed
  checkbox.id = `todo-${todo.id}`
  checkbox.addEventListener("change", () => handleToggleTodo(todo.id))

  // 텍스트 설정
  const todoText = todoItem.querySelector(".todo-text")
  todoText.textContent = todo.text
  todoText.htmlFor = `todo-${todo.id}`
  if (todo.completed) {
    todoText.classList.add("completed")
  }

  // 버튼 이벤트 설정
  const editButton = todoItem.querySelector(".edit-button")
  editButton.addEventListener("click", () => handleEditMode(todo.id))

  const deleteButton = todoItem.querySelector(".delete-button")
  deleteButton.addEventListener("click", () => handleDeleteTodo(todo.id))

  return todoItem
}

// 할 일 수정 모드 UI 생성
function createTodoEditItem(todo) {
  const template = todoEditTemplate.content.cloneNode(true)
  const todoEditItem = template.querySelector(".todo-item-edit")

  // 입력 필드 설정
  const editInput = todoEditItem.querySelector(".todo-edit-input")
  editInput.value = todo.text
  editInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      handleUpdateTodo(todo.id, editInput.value)
    } else if (e.key === "Escape") {
      renderTodos()
    }
  })

  // 버튼 이벤트 설정
  const saveButton = todoEditItem.querySelector(".save-button")
  saveButton.addEventListener("click", () => handleUpdateTodo(todo.id, editInput.value))

  const cancelButton = todoEditItem.querySelector(".cancel-button")
  cancelButton.addEventListener("click", renderTodos)

  return todoEditItem
}

// 할 일 추가 처리
function handleAddTodo(e) {
  e.preventDefault()

  const text = todoInput.value.trim()
  if (!text) return

  // 새 할 일 생성
  const newId = todos.length > 0 ? Math.max(...todos.map((todo) => todo.id)) + 1 : 1
  const newTodo = {
    id: newId,
    text: text,
    completed: false,
  }

  // 할 일 목록에 추가
  todos.push(newTodo)

  // 렌더링
  renderTodos()

  // 입력 필드 초기화
  todoInput.value = ""
}

// 할 일 완료 상태 토글 처리
function handleToggleTodo(id) {
  todos = todos.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo))

  renderTodos()
}

// 할 일 수정 모드 처리
function handleEditMode(id) {
  const todo = todos.find((todo) => todo.id === id)
  if (!todo) return

  const todoItem = document.querySelector(`.todo-item[data-id="${id}"]`)
  if (!todoItem) return

  // 기존 항목 숨기기
  todoItem.innerHTML = ""

  // 수정 UI 추가
  const editItem = createTodoEditItem(todo)
  todoItem.appendChild(editItem)

  // 입력 필드에 포커스
  const editInput = todoItem.querySelector(".todo-edit-input")
  editInput.focus()
}

// 할 일 수정 처리
function handleUpdateTodo(id, newText) {
  if (!newText.trim()) return

  todos = todos.map((todo) => (todo.id === id ? { ...todo, text: newText.trim() } : todo))

  renderTodos()
}

// 할 일 삭제 처리
function handleDeleteTodo(id) {
  todos = todos.filter((todo) => todo.id !== id)

  renderTodos()
} 