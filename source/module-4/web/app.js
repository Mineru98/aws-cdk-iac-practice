// 전역 변수
let isLoggedIn = false
let todos = []

// DOM 요소
const todoForm = document.getElementById("todo-form")
const todoInput = document.getElementById("todo-input")
const todoList = document.getElementById("todo-list")
const loadingMessage = document.getElementById("loading-message")
const emptyMessage = document.getElementById("empty-message")
const errorMessage = document.getElementById("error-message")
const todoItemTemplate = document.getElementById("todo-item-template")

// 인증 관련 DOM 요소
const loggedOutSection = document.getElementById("logged-out-section")
const loggedInSection = document.getElementById("logged-in-section")
const loginButton = document.getElementById("login-button")
const logoutButton = document.getElementById("logout-button")
const loginModal = document.getElementById("login-modal")
const closeModalButton = document.getElementById("close-modal")
const loginForm = document.getElementById("login-form")

// 초기화
document.addEventListener("DOMContentLoaded", () => {
  initializeAuth()
  loadTodos()
  setupEventListeners()
})

// 이벤트 리스너 설정
function setupEventListeners() {
  todoForm.addEventListener("submit", handleAddTodo)
  loginButton.addEventListener("click", showLoginModal)
  logoutButton.addEventListener("click", handleLogout)
  closeModalButton.addEventListener("click", hideLoginModal)
  loginForm.addEventListener("submit", handleLogin)
  
  // 모달 외부 클릭 시 닫기
  loginModal.addEventListener("click", (e) => {
    if (e.target === loginModal) {
      hideLoginModal()
    }
  })
}

// 인증 상태 초기화
function initializeAuth() {
  const sessionTokens = localStorage.getItem('sessionTokens')
  if (sessionTokens) {
    try {
      JSON.parse(sessionTokens)
      showLoggedInState()
    } catch (error) {
      showLoggedOutState()
    }
  } else {
    showLoggedOutState()
  }
}

// 로그인 상태 표시
function showLoggedInState() {
  isLoggedIn = true
  loggedOutSection.classList.add("hidden")
  loggedInSection.classList.remove("hidden")
  hideLoginModal()
}

// 로그아웃 상태 표시
function showLoggedOutState() {
  isLoggedIn = false
  loggedOutSection.classList.remove("hidden")
  loggedInSection.classList.add("hidden")
}

// 로그인 모달 표시
function showLoginModal() {
  loginModal.classList.remove("hidden")
  document.getElementById("email").focus()
}

// 로그인 모달 숨기기
function hideLoginModal() {
  loginModal.classList.add("hidden")
  loginForm.reset()
}

// 로그인 처리
function handleLogin(e) {
  e.preventDefault()
  
  const email = document.getElementById('email').value
  const password = document.getElementById('password').value
  
  const poolData = {
    UserPoolId: cognitoUserPoolId,
    ClientId: cognitoUserPoolClientId
  }
  
  const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData)
  const userData = {
    Username: email,
    Pool: userPool
  }
  
  const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData)
  const authenticationData = {
    Username: email,
    Password: password
  }
  
  const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData)
  
  cognitoUser.authenticateUser(authenticationDetails, {
    onSuccess: function(result) {
      console.log('로그인 성공')
      const sessionTokens = {
        IdToken: result.idToken,
        AccessToken: result.accessToken,
        RefreshToken: result.refreshToken
      }
      localStorage.setItem('sessionTokens', JSON.stringify(sessionTokens))
      showLoggedInState()
      renderTodos() // 버튼 상태 업데이트를 위해 다시 렌더링
    },
    onFailure: function(err) {
      console.log('로그인 실패:', err)
      alert('로그인에 실패했습니다: ' + err.message)
    }
  })
}

// 로그아웃 처리
function handleLogout() {
  localStorage.removeItem('sessionTokens')
  showLoggedOutState()
  renderTodos() // 버튼 상태 업데이트를 위해 다시 렌더링
}

// 할 일 목록 로드
async function loadTodos() {
  try {
    showLoading(true)
    hideError()
    
    if (!todosApiEndpoint || todosApiEndpoint === 'REPLACE_ME') {
      throw new Error('API 엔드포인트가 설정되지 않았습니다.')
    }

    const response = await fetch(todosApiEndpoint + '/todos')
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    console.log('API 응답 전체 데이터:', data)
    console.log('데이터 타입:', typeof data)
    
    // API 응답 구조에 따른 처리
    if (Array.isArray(data)) {
      todos = data
    } else if (data.todos && Array.isArray(data.todos)) {
      todos = data.todos
    } else if (data.body) {
      // Lambda 프록시 통합의 경우 body에 JSON 문자열이 들어있을 수 있음
      try {
        const bodyData = typeof data.body === 'string' ? JSON.parse(data.body) : data.body
        console.log('Body 데이터:', bodyData)
        
        if (Array.isArray(bodyData)) {
          todos = bodyData
        } else if (bodyData.todos && Array.isArray(bodyData.todos)) {
          todos = bodyData.todos
        } else {
          todos = []
        }
      } catch (parseError) {
        console.error('Body 파싱 오류:', parseError)
        todos = []
      }
    } else {
      console.log('예상치 못한 데이터 구조:', data)
      todos = []
    }
    
    console.log('최종 todos 배열:', todos)
    console.log('todos 길이:', todos.length)
  } catch (error) {
    console.error("할 일 목록 로드 오류:", error)
    showError('데이터를 불러오는 중 오류가 발생했습니다: ' + error.message)
    todos = []
  } finally {
    showLoading(false)
    renderTodos()
  }
}

// 할 일 추가 처리
async function handleAddTodo(e) {
  e.preventDefault()

  const text = todoInput.value.trim()
  if (!text) return

  try {
    const response = await fetch(todosApiEndpoint + '/todos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text: text })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    todoInput.value = ""
    loadTodos() // 새로고침
  } catch (error) {
    console.error('할 일 추가 오류:', error)
    alert('할 일 추가에 실패했습니다.')
  }
}

// 할 일 완료 상태 토글 처리
async function handleToggleTodo(id) {
  if (!isLoggedIn) {
    alert('로그인이 필요한 기능입니다.')
    return
  }

  try {
    const sessionTokensString = localStorage.getItem('sessionTokens')
    const sessionTokens = JSON.parse(sessionTokensString)
    const idJwt = sessionTokens.IdToken.jwtToken

    const response = await fetch(todosApiEndpoint + '/todos/' + id + '/toggle', {
      method: 'POST',
      headers: { 'Authorization': idJwt }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    loadTodos() // 새로고침
  } catch (error) {
    console.error('할 일 상태 변경 오류:', error)
    alert('할 일 상태 변경에 실패했습니다.')
  }
}

// 할 일 삭제 처리
async function handleDeleteTodo(id) {
  if (!isLoggedIn) {
    alert('로그인이 필요한 기능입니다.')
    return
  }

  if (!confirm('정말로 이 할 일을 삭제하시겠습니까?')) {
    return
  }

  try {
    const sessionTokensString = localStorage.getItem('sessionTokens')
    const sessionTokens = JSON.parse(sessionTokensString)
    const idJwt = sessionTokens.IdToken.jwtToken

    const response = await fetch(todosApiEndpoint + '/todos/' + id, {
      method: 'DELETE',
      headers: { 'Authorization': idJwt }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    loadTodos() // 새로고침
  } catch (error) {
    console.error('할 일 삭제 오류:', error)
    alert('할 일 삭제에 실패했습니다.')
  }
}

// 할 일 목록 렌더링
function renderTodos() {
  todoList.innerHTML = ""

  if (todos.length === 0) {
    emptyMessage.classList.remove("hidden")
    return
  }

  emptyMessage.classList.add("hidden")

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
  checkbox.disabled = !isLoggedIn
  checkbox.addEventListener("change", () => handleToggleTodo(todo.id))

  // 텍스트 설정
  const todoText = todoItem.querySelector(".todo-text")
  todoText.textContent = todo.text
  if (todo.completed) {
    todoText.classList.add("completed")
  }

  // 삭제 버튼 설정
  const deleteButton = todoItem.querySelector(".delete-button")
  deleteButton.disabled = !isLoggedIn
  deleteButton.addEventListener("click", () => handleDeleteTodo(todo.id))

  return todoItem
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