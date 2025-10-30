import pytest
from main_calc import add, subtract, multiply, divide, calculate, main

class TestBasicOperations:
    
    def test_add(self):
        assert add(2, 3) == 5
        assert add(-1, 1) == 0
        assert add(0, 0) == 0
    
    def test_subtract(self):
        assert subtract(5, 3) == 2
        assert subtract(0, 5) == -5
        assert subtract(10, 10) == 0
    
    def test_multiply(self):
        assert multiply(3, 4) == 12
        assert multiply(-2, 5) == -10
        assert multiply(0, 100) == 0
    
    def test_divide(self):
        assert divide(10, 2) == 5
        assert divide(9, 3) == 3
        assert divide(7, 2) == 3.5
    
    def test_divide_by_zero(self):
        with pytest.raises(ValueError, match="Cannot divide by zero"):
            divide(10, 0)

class TestCalculateFunction:
    
    def test_calculate_add(self):
        assert calculate('add', 5, 3) == 8
    
    def test_calculate_subtract(self):
        assert calculate('subtract', 10, 4) == 6
    
    def test_calculate_multiply(self):
        assert calculate('multiply', 6, 7) == 42
    
    def test_calculate_divide(self):
        assert calculate('divide', 20, 4) == 5
    
    def test_calculate_invalid_operation(self):
        with pytest.raises(ValueError, match="Unknown operation"):
            calculate('power', 2, 3)

class TestMainFunction:
    
    def test_main_runs_successfully(self):
        result = main()
        assert result == "All calculations completed"
    
    def test_main_returns_string(self):
        result = main()
        assert isinstance(result, str)
