
pipeline {
    agent any

    options {
        timestamps()
        timeout(time: 25, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '15'))
    }

    parameters {
        string(
            name: 'PYTHON_EXE',
            defaultValue: 'C:/Users/Sarthak Vashisht/AppData/Local/Programs/Python/Python311/python.exe',
            description: 'Full path to Python executable available to Jenkins service'
        )
        string(
            name: 'PERF_REQUESTS',
            defaultValue: '100',
            description: 'HTTP requests per endpoint (1-2000)'
        )
        string(
            name: 'PERF_CONCURRENCY',
            defaultValue: '5',
            description: 'Concurrent requests (1-50)'
        )
    }

    environment {
        PYTHONUNBUFFERED = '1'
        HEADLESS = '1'
    }

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
                bat '''
                    @echo on
                    if not exist reports mkdir reports
                    if not exist data mkdir data
                    if exist reports\\server.pid del /q reports\\server.pid
                    if exist reports\\server.log del /q reports\\server.log
                    if exist reports\\server.err.log del /q reports\\server.err.log
                    if exist data\\jenkins-testing.db del /q data\\jenkins-testing.db
                    if exist data\\jenkins-testing.db-shm del /q data\\jenkins-testing.db-shm
                    if exist data\\jenkins-testing.db-wal del /q data\\jenkins-testing.db-wal
                    set TRAFFIC_DB=%WORKSPACE%\\data\\jenkins-testing.db
                    .venv\\Scripts\\python.exe -u testing\\start_server.py
                    if errorlevel 1 exit /b 1
                '''
            }
        }


        
        stage('Wait until app ready') {
            steps {
                timeout(time: 75, unit: 'SECONDS') {
                    bat '''
                        @echo on
                        set TRAFFICMIND_URL=http://127.0.0.1:8000
                        .venv\\Scripts\\python.exe -u testing\\wait_for_app.py
                    '''
                }
            }
        }


        stage('Functional tests - Selenium') {
            steps {
                bat 'set TRAFFICMIND_URL=http://127.0.0.1:8000&& set TEST_REPORTS_DIR=reports&& .venv\\Scripts\\python.exe -m pytest tests\\functional -v -s --junitxml=reports\\selenium-results.xml'
            }
        }

        stage('Non-functional tests - HTTP performance') {
            steps {
                bat 'set TRAFFICMIND_URL=http://127.0.0.1:8000&& set TEST_REPORTS_DIR=reports&& set PERF_REQUESTS=%PERF_REQUESTS%&& set PERF_CONCURRENCY=%PERF_CONCURRENCY%&& .venv\\Scripts\\python.exe -m pytest tests\\performance -v -s --junitxml=reports\\performance-results.xml'
            }
        }
    }

    post {
        always {
            powershell '''
                $pidFile = Join-Path $env:WORKSPACE "reports\\server.pid"

                if (Test-Path $pidFile) {
                    $saved = (Get-Content $pidFile | Select-Object -First 1).Trim()

                    if ($saved -match '^\\d+$') {
                        $serverPid = [int]$saved
                        $process = Get-Process -Id $serverPid -ErrorAction SilentlyContinue

                        if ($process) {
                            Stop-Process -Id $serverPid -Force -ErrorAction SilentlyContinue
                            Write-Output "Stopped test application process $serverPid."
                        }
                    }
                }
            '''

            junit(
                testResults: 'reports/*-results.xml',
                allowEmptyResults: true
            )

            archiveArtifacts(
                artifacts: 'reports/**',
                allowEmptyArchive: true
            )
        }
    }
}
