pipeline {
    agent any
    options { timestamps(); timeout(time: 25, unit: 'MINUTES'); buildDiscarder(logRotator(numToKeepStr: '15')) }
    parameters {
        string(name: 'PYTHON_EXE', defaultValue: 'C:/Users/Sarthak Vashisht/AppData/Local/Programs/Python/Python311/python.exe', description: 'Full path to Python executable available to Jenkins service')
        string(name: 'PERF_REQUESTS', defaultValue: '100', description: 'HTTP requests per endpoint (1-2000)')
        string(name: 'PERF_CONCURRENCY', defaultValue: '5', description: 'Concurrent requests (1-50)')
    }
    environment { PYTHONUNBUFFERED = '1'; HEADLESS = '1' }
    stages {
        stage('Check tools and prepare workspace') {
            steps {
                script {
                    bat 'if exist reports rmdir /s /q reports'
                    bat 'mkdir reports'
                    bat 'if not exist data mkdir data'
                    bat 'echo Python executable: %PYTHON_EXE%'
                    bat '"%PYTHON_EXE%" --version'
                    bat 'node --version'
                    bat 'npm --version'
                    bat 'java -version'
                    bat 'if exist .venv rmdir /s /q .venv'
                    bat '"%PYTHON_EXE%" -m venv .venv'
                    bat '.venv\\Scripts\\python.exe -m pip install --upgrade pip'
                    bat '.venv\\Scripts\\python.exe -m pip install -r requirements-dev.txt -r testing\\requirements.txt'
                    bat 'npm ci --no-audit --no-fund'
                    bat 'npm test'
                    bat 'npm run build'
                }
            }
        }
        stage('Existing Python regression tests') {
            steps {
                bat '.venv\\Scripts\\python.exe -m pytest tests -q --ignore=tests\\functional --ignore=tests\\performance --junitxml=reports\\backend-regression-results.xml'
            }
        }
        
        stage('Start isolated test application') {
            steps {
                powershell '''
                    $ErrorActionPreference = "Stop"

                    New-Item -ItemType Directory -Force reports | Out-Null
                    New-Item -ItemType Directory -Force data | Out-Null

                    $tcp = New-Object System.Net.Sockets.TcpClient
                    try {
                        $tcp.Connect("127.0.0.1", 8000)
                        $tcp.Close()
                        throw "Port 8000 is already in use."
                    } catch [System.Net.Sockets.SocketException] {
                        Write-Output "Port 8000 is free."
                    }

                    foreach ($f in @(
                        "data\\jenkins-testing.db",
                        "data\\jenkins-testing.db-wal",
                        "data\\jenkins-testing.db-shm"
                    )) {
                        if (Test-Path $f) { Remove-Item $f -Force }
                    }

                    $env:TRAFFIC_DB = Join-Path $env:WORKSPACE "data\\jenkins-testing.db"
                    $python = Join-Path $env:WORKSPACE ".venv\\Scripts\\python.exe"
                    $out = Join-Path $env:WORKSPACE "reports\\server.log"
                    $err = Join-Path $env:WORKSPACE "reports\\server.err.log"

                    $proc = Start-Process `
                        -FilePath $python `
                        -ArgumentList @("run.py", "--host", "127.0.0.1", "--port", "8000", "--no-browser") `
                        -WorkingDirectory $env:WORKSPACE `
                        -RedirectStandardOutput $out `
                        -RedirectStandardError $err `
                        -PassThru

                    Set-Content -Path (Join-Path $env:WORKSPACE "reports\\server.pid") -Value $proc.Id
                    Write-Output "Started application process $($proc.Id)."

                    Start-Sleep -Seconds 2
                    if ($proc.HasExited) {
                        Get-Content $err -ErrorAction SilentlyContinue
                        throw "Application exited immediately with code $($proc.ExitCode)."
                    }

                    Write-Output "Application process is running; continuing to readiness check."
                '''
            }
        }

        stage('Wait until app is ready') {
            steps { bat 'set TRAFFICMIND_URL=http://127.0.0.1:8000&& .venv\\Scripts\\python.exe testing\\wait_for_app.py' }
        }
        stage('Functional tests - Selenium') {
            steps { bat 'set TRAFFICMIND_URL=http://127.0.0.1:8000&& set TEST_REPORTS_DIR=reports&& .venv\\Scripts\\python.exe -m pytest tests\\functional -v -s --junitxml=reports\\selenium-results.xml' }
        }
        stage('Non-functional tests - HTTP performance') {
            steps { bat 'set TRAFFICMIND_URL=http://127.0.0.1:8000&& set TEST_REPORTS_DIR=reports&& set PERF_REQUESTS=%PERF_REQUESTS%&& set PERF_CONCURRENCY=%PERF_CONCURRENCY%&& .venv\\Scripts\\python.exe -m pytest tests\\performance -v -s --junitxml=reports\\performance-results.xml' }
        }
    }
    post {
        always {
            powershell '''
                $pidFile = Join-Path $env:WORKSPACE "reports\\server.pid"
                if (Test-Path $pidFile) {
                    $saved = (Get-Content $pidFile | Select-Object -First 1).Trim()
                    if ($saved -match '^\\d+$') { Stop-Process -Id ([int]$saved) -Force -ErrorAction SilentlyContinue; Write-Output "Stopped application process $saved if it was still running." }
                }
            '''
            junit testResults: 'reports/*-results.xml', allowEmptyResults: true
            archiveArtifacts artifacts: 'reports/**', allowEmptyArchive: true
        }
    }
}
