def calculate(operation, a, b):
  operations={
    'add':add,
    'subtract':subract,
    'multiply':'multiply,
    'divide':'divide
    }

def add(a,b):
  return a+b
  
def subtract(a,b):
  return a-b
  
def multiply(a,b):
  return a*b
  
def divide(a,b):
  if b==0:
   raise ValueError("Cannot divide by zero")
 return a / b

if operation not in operations:
  raise ValueError(f"{operation} not possible")
def main():
  print(f"2+2={calculate(add,2,2)}")
  print(f"5-2={calculate(subtract,5,2)}")
  print(f"2*3={calculate(multiply,2,3)}")
  print(f"8/4={calculate(divide,8,4)}")
return "All calculations completed"

if __name__ == "__main__":
    result = main()
    print(result)
  
