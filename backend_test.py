#!/usr/bin/env python3
"""
Comprehensive Backend Testing Suite for Cybersecurity Vulnerability Assessment Application
Tests all three backend services: Backend1 (Auth), Backend2 (Reports), Backend Flask (Documents)
"""

import requests
import json
import time
import sys
from typing import Dict, Any, Optional
from datetime import datetime

class CybersecurityAppTester:
    def __init__(self):
        # Backend service endpoints
        self.backend1_url = "http://localhost:5000/api"  # Authentication service
        self.backend2_url = "http://localhost:5001/api"  # Reports service  
        self.backend_flask_url = "http://localhost:5002/api"  # Document processing service
        
        # Test results tracking
        self.results = {
            "backend1_auth": [],
            "backend2_reports": [],
            "backend_flask": [],
            "summary": {}
        }
        
        # Authentication token for protected routes
        self.auth_token = None
        
        # Test user data
        self.test_user = {
            "name": "Test User",
            "email": f"test_{int(time.time())}@cybersecurity.test",
            "password": "TestPassword123!"
        }
        
        # Test report data
        self.test_report = {
            "title": f"Test Report {int(time.time())}",
            "password": "ReportPassword123!",
            "confirmPassword": "ReportPassword123!",
            "createdTime": datetime.now().isoformat()
        }

    def log_test(self, service: str, test_name: str, success: bool, response: Dict[Any, Any] = None, error: str = None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "timestamp": datetime.now().isoformat(),
            "response": response,
            "error": error
        }
        self.results[service].append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} | {service.upper()} | {test_name}")
        if error:
            print(f"    Error: {error}")

    def test_service_health(self, service_name: str, url: str) -> bool:
        """Test if service is accessible"""
        try:
            response = requests.get(f"{url.rstrip('/api')}/health", timeout=5)
            success = response.status_code == 200
            self.log_test(service_name, "Health Check", success, response.json() if success else None, 
                         None if success else f"HTTP {response.status_code}")
            return success
        except Exception as e:
            self.log_test(service_name, "Health Check", False, None, str(e))
            return False

    def test_backend1_auth_service(self) -> bool:
        """Test Backend1 authentication service"""
        print(f"\n🔒 Testing Backend1 Authentication Service ({self.backend1_url})")
        
        # Health check
        if not self.test_service_health("backend1_auth", self.backend1_url):
            return False
        
        success_count = 0
        total_tests = 4
        
        # Test 1: Register new user
        try:
            response = requests.post(f"{self.backend1_url}/auth/register", 
                                   json=self.test_user, timeout=10)
            if response.status_code == 201:
                data = response.json()
                self.auth_token = data.get('token')
                self.log_test("backend1_auth", "User Registration", True, data)
                success_count += 1
            else:
                self.log_test("backend1_auth", "User Registration", False, 
                            response.json() if response.text else None,
                            f"HTTP {response.status_code}")
        except Exception as e:
            self.log_test("backend1_auth", "User Registration", False, None, str(e))
        
        # Test 2: Login user
        try:
            login_data = {"email": self.test_user["email"], "password": self.test_user["password"]}
            response = requests.post(f"{self.backend1_url}/auth/login", 
                                   json=login_data, timeout=10)
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get('token')  # Update token
                self.log_test("backend1_auth", "User Login", True, data)
                success_count += 1
            else:
                self.log_test("backend1_auth", "User Login", False,
                            response.json() if response.text else None,
                            f"HTTP {response.status_code}")
        except Exception as e:
            self.log_test("backend1_auth", "User Login", False, None, str(e))
        
        # Test 3: Get user data (protected route)
        if self.auth_token:
            try:
                headers = {"Authorization": f"Bearer {self.auth_token}"}
                response = requests.get(f"{self.backend1_url}/auth/user", 
                                      headers=headers, timeout=10)
                success = response.status_code == 200
                self.log_test("backend1_auth", "Get User Data", success,
                            response.json() if success else None,
                            f"HTTP {response.status_code}" if not success else None)
                if success:
                    success_count += 1
            except Exception as e:
                self.log_test("backend1_auth", "Get User Data", False, None, str(e))
        
        # Test 4: Test invalid login
        try:
            invalid_login = {"email": self.test_user["email"], "password": "wrongpassword"}
            response = requests.post(f"{self.backend1_url}/auth/login", 
                                   json=invalid_login, timeout=10)
            # Should fail with 400
            success = response.status_code == 400
            self.log_test("backend1_auth", "Invalid Login Test", success,
                        None if success else response.json(),
                        None if success else f"Expected 400, got {response.status_code}")
            if success:
                success_count += 1
        except Exception as e:
            self.log_test("backend1_auth", "Invalid Login Test", False, None, str(e))
        
        print(f"Backend1 Auth Tests: {success_count}/{total_tests} passed")
        return success_count >= 3  # At least 3/4 tests should pass

    def test_backend2_reports_service(self) -> bool:
        """Test Backend2 reports service"""
        print(f"\n📊 Testing Backend2 Reports Service ({self.backend2_url})")
        
        # Health check
        if not self.test_service_health("backend2_reports", self.backend2_url):
            return False
        
        success_count = 0
        total_tests = 6
        report_id = None
        
        if not self.auth_token:
            print("❌ No auth token available, skipping protected route tests")
            return False
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        # Test 1: Create new report
        try:
            response = requests.post(f"{self.backend2_url}/reports", 
                                   json=self.test_report, headers=headers, timeout=10)
            if response.status_code == 201:
                data = response.json()
                report_id = data.get('_id')
                self.log_test("backend2_reports", "Create Report", True, data)
                success_count += 1
            else:
                self.log_test("backend2_reports", "Create Report", False,
                            response.json() if response.text else None,
                            f"HTTP {response.status_code}")
        except Exception as e:
            self.log_test("backend2_reports", "Create Report", False, None, str(e))
        
        # Test 2: Get all reports
        try:
            response = requests.get(f"{self.backend2_url}/reports", 
                                  headers=headers, timeout=10)
            success = response.status_code == 200
            self.log_test("backend2_reports", "Get All Reports", success,
                        response.json() if success else None,
                        f"HTTP {response.status_code}" if not success else None)
            if success:
                success_count += 1
        except Exception as e:
            self.log_test("backend2_reports", "Get All Reports", False, None, str(e))
        
        # Test 3: Get report by ID
        if report_id:
            try:
                response = requests.get(f"{self.backend2_url}/reports/{report_id}", 
                                      headers=headers, timeout=10)
                success = response.status_code == 200
                self.log_test("backend2_reports", "Get Report by ID", success,
                            response.json() if success else None,
                            f"HTTP {response.status_code}" if not success else None)
                if success:
                    success_count += 1
            except Exception as e:
                self.log_test("backend2_reports", "Get Report by ID", False, None, str(e))
        
        # Test 4: Save dashboard data
        if report_id:
            dashboard_data = {
                "cvssScore": {"baseScore": 7.2, "riskLevel": "High"},
                "severityDistribution": {"critical": 2, "high": 5, "medium": 8, "low": 3, "informative": 1},
                "timestamp": datetime.now().isoformat()
            }
            try:
                response = requests.post(f"{self.backend2_url}/reports/dashboard/{report_id}", 
                                       json=dashboard_data, headers=headers, timeout=10)
                success = response.status_code == 200
                self.log_test("backend2_reports", "Save Dashboard Data", success,
                            response.json() if success else None,
                            f"HTTP {response.status_code}" if not success else None)
                if success:
                    success_count += 1
            except Exception as e:
                self.log_test("backend2_reports", "Save Dashboard Data", False, None, str(e))
        
        # Test 5: Get dashboard data
        if report_id:
            try:
                response = requests.get(f"{self.backend2_url}/reports/dashboard/{report_id}", 
                                      headers=headers, timeout=10)
                success = response.status_code == 200
                self.log_test("backend2_reports", "Get Dashboard Data", success,
                            response.json() if success else None,
                            f"HTTP {response.status_code}" if not success else None)
                if success:
                    success_count += 1
            except Exception as e:
                self.log_test("backend2_reports", "Get Dashboard Data", False, None, str(e))
        
        # Test 6: Search reports
        try:
            response = requests.get(f"{self.backend2_url}/reports?search=Test", 
                                  headers=headers, timeout=10)
            success = response.status_code == 200
            self.log_test("backend2_reports", "Search Reports", success,
                        response.json() if success else None,
                        f"HTTP {response.status_code}" if not success else None)
            if success:
                success_count += 1
        except Exception as e:
            self.log_test("backend2_reports", "Search Reports", False, None, str(e))
        
        print(f"Backend2 Reports Tests: {success_count}/{total_tests} passed")
        return success_count >= 4  # At least 4/6 tests should pass

    def test_backend_flask_service(self) -> bool:
        """Test Backend Flask document processing service"""
        print(f"\n📄 Testing Backend Flask Service ({self.backend_flask_url})")
        
        success_count = 0
        total_tests = 2
        
        # Test 1: Health check (root endpoint)
        try:
            response = requests.get(f"{self.backend_flask_url.rstrip('/api')}", timeout=5)
            success = response.status_code == 200 and "API is running" in response.text
            self.log_test("backend_flask", "Flask Health Check", success,
                        {"message": response.text} if success else None,
                        f"HTTP {response.status_code}" if not success else None)
            if success:
                success_count += 1
        except Exception as e:
            self.log_test("backend_flask", "Flask Health Check", False, None, str(e))
        
        # Test 2: Test if Flask app is responsive
        try:
            response = requests.get(f"{self.backend_flask_url.rstrip('/api')}/", timeout=5)
            success = response.status_code in [200, 404]  # Either OK or not found is acceptable
            self.log_test("backend_flask", "Flask Responsiveness", success,
                        None,
                        None if success else f"HTTP {response.status_code}")
            if success:
                success_count += 1
        except Exception as e:
            self.log_test("backend_flask", "Flask Responsiveness", False, None, str(e))
        
        print(f"Backend Flask Tests: {success_count}/{total_tests} passed")
        return success_count >= 1  # At least 1/2 tests should pass

    def run_comprehensive_test(self) -> Dict[str, Any]:
        """Run comprehensive testing suite"""
        print("🚀 Starting Comprehensive Backend Testing Suite")
        print("=" * 60)
        
        start_time = time.time()
        
        # Test all backend services
        backend1_success = self.test_backend1_auth_service()
        backend2_success = self.test_backend2_reports_service()
        backend_flask_success = self.test_backend_flask_service()
        
        end_time = time.time()
        total_duration = end_time - start_time
        
        # Calculate summary
        total_tests = sum(len(self.results[service]) for service in self.results if service != "summary")
        passed_tests = sum(len([test for test in self.results[service] if test.get("success", False)]) 
                          for service in self.results if service != "summary")
        
        self.results["summary"] = {
            "total_tests": total_tests,
            "passed_tests": passed_tests,
            "failed_tests": total_tests - passed_tests,
            "success_rate": (passed_tests / total_tests * 100) if total_tests > 0 else 0,
            "duration_seconds": round(total_duration, 2),
            "services_tested": 3,
            "services_passed": sum([backend1_success, backend2_success, backend_flask_success]),
            "backend1_auth": backend1_success,
            "backend2_reports": backend2_success,
            "backend_flask": backend_flask_success,
            "overall_success": all([backend1_success, backend2_success, backend_flask_success])
        }
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 COMPREHENSIVE TEST RESULTS SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {total_tests}")
        print(f"Passed Tests: {passed_tests}")
        print(f"Failed Tests: {total_tests - passed_tests}")
        print(f"Success Rate: {self.results['summary']['success_rate']:.1f}%")
        print(f"Test Duration: {total_duration:.2f} seconds")
        print("\n📋 Service Status:")
        print(f"  Backend1 (Auth): {'✅ PASS' if backend1_success else '❌ FAIL'}")
        print(f"  Backend2 (Reports): {'✅ PASS' if backend2_success else '❌ FAIL'}")
        print(f"  Backend Flask (Docs): {'✅ PASS' if backend_flask_success else '❌ FAIL'}")
        
        overall_status = "✅ ALL SERVICES OPERATIONAL" if self.results["summary"]["overall_success"] else "⚠️  SOME SERVICES NEED ATTENTION"
        print(f"\n🎯 Overall Status: {overall_status}")
        
        return self.results

    def save_results_to_file(self, filename: str = "backend_test_results.json"):
        """Save test results to JSON file"""
        with open(filename, 'w') as f:
            json.dump(self.results, f, indent=2, default=str)
        print(f"\n💾 Test results saved to: {filename}")

def main():
    """Main function to run the testing suite"""
    tester = CybersecurityAppTester()
    
    print("🔐 Cybersecurity Vulnerability Assessment Application")
    print("🧪 Comprehensive Backend Testing Suite")
    print("⏰ Starting tests at:", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    
    # Wait a moment for services to be ready
    print("\n⏳ Waiting for services to initialize...")
    time.sleep(3)
    
    # Run comprehensive tests
    results = tester.run_comprehensive_test()
    
    # Save results
    tester.save_results_to_file()
    
    # Exit with appropriate code
    exit_code = 0 if results["summary"]["overall_success"] else 1
    print(f"\n🏁 Testing completed with exit code: {exit_code}")
    sys.exit(exit_code)

if __name__ == "__main__":
    main()