window.HARDCODED_QUESTIONS = [
  {
    id: "q01",
    title: "Debug Python Program 1 (Sum and Average)",
    language: "python",
    buggyCode: `print("Program 1 start")\nnums = [10,20,30,40]\ntotal = 0\nfor n in nums\n    total = total + n\navg = total / len(nums)\nprint("Average:", avg)\nprint("Program end")`,
    correctCode: `print("Program 1 start")\nnums = [10,20,30,40]\ntotal = 0\nfor n in nums:\n    total = total + n\navg = total / len(nums)\nprint("Average:", avg)\nprint("Program end")`
  },
  {
    id: "q02",
    title: "Debug Python Program 2 (Factorial)",
    language: "python",
    buggyCode: `print("Program 2 start")\nnum = 5\nfact = 1\nfor i in range(1, num+1)\n    fact = fact * i\nprint("Factorial:", fact)\nprint("Program end")`,
    correctCode: `print("Program 2 start")\nnum = 5\nfact = 1\nfor i in range(1, num+1):\n    fact = fact * i\nprint("Factorial:", fact)\nprint("Program end")`
  },
  {
    id: "q03",
    title: "Debug Python Program 3 (Even or Odd)",
    language: "python",
    buggyCode: `print("Program 3 start")\nnum = 7\nif num % 2 == 0\n    print("Even number")\nelse\n    print("Odd number")\nprint("Program end")`,
    correctCode: `print("Program 3 start")\nnum = 7\nif num % 2 == 0:\n    print("Even number")\nelse:\n    print("Odd number")\nprint("Program end")`
  },
  {
    id: "q04",
    title: "Debug Python Program 4 (Multiply array elements)",
    language: "python",
    buggyCode: `print("Program 4 start")\nnums = [3,6,9,12]\nfor n in nums\n    print(n * 2)\nprint("Program end")`,
    correctCode: `print("Program 4 start")\nnums = [3,6,9,12]\nfor n in nums:\n    print(n * 2)\nprint("Program end")`
  },
  {
    id: "q05",
    title: "Debug Python Program 5 (Sum of 1 to 5)",
    language: "python",
    buggyCode: `print("Program 5 start")\ntotal = 0\nfor i in range(1,6)\n    total = total + i\nprint("Sum:", total)\nprint("Program end")`,
    correctCode: `print("Program 5 start")\ntotal = 0\nfor i in range(1,6):\n    total = total + i\nprint("Sum:", total)\nprint("Program end")`
  },
  {
    id: "q06",
    title: "Debug Python Program 6 (Largest number in array)",
    language: "python",
    buggyCode: `print("Program 6 start")\nnums = [5,10,15]\nlargest = nums[0]\nfor n in nums\n    if n > largest\n        largest = n\nprint("Largest:", largest)\nprint("Program end")`,
    correctCode: `print("Program 6 start")\nnums = [5,10,15]\nlargest = nums[0]\nfor n in nums:\n    if n > largest:\n        largest = n\nprint("Largest:", largest)\nprint("Program end")`
  },
  {
    id: "q07",
    title: "Debug Python Program 7 (Print characters of a string)",
    language: "python",
    buggyCode: `print("Program 7 start")\ntext = "python"\nfor ch in text\n    print(ch)\nprint("Program end")`,
    correctCode: `print("Program 7 start")\ntext = "python"\nfor ch in text:\n    print(ch)\nprint("Program end")`
  },
  {
    id: "q08",
    title: "Debug Python Program 8 (Sum with += operator)",
    language: "python",
    buggyCode: `print("Program 8 start")\nnums = [2,4,6,8]\ntotal = 0\nfor n in nums\n    total += n\nprint("Total:", total)\nprint("Program end")`,
    correctCode: `print("Program 8 start")\nnums = [2,4,6,8]\ntotal = 0\nfor n in nums:\n    total += n\nprint("Total:", total)\nprint("Program end")`
  },
  {
    id: "q09",
    title: "Debug Python Program 9 (Reverse a number)",
    language: "python",
    buggyCode: `print("Program 9 start")\nnum = 123\nrev = 0\nwhile num > 0\n    digit = num % 10\n    rev = rev * 10 + digit\n    num = num // 10\nprint("Reverse:", rev)\nprint("Program end")`,
    correctCode: `print("Program 9 start")\nnum = 123\nrev = 0\nwhile num > 0:\n    digit = num % 10\n    rev = rev * 10 + digit\n    num = num // 10\nprint("Reverse:", rev)\nprint("Program end")`
  },
  {
    id: "q10",
    title: "Debug Python Program 10 (Count elements)",
    language: "python",
    buggyCode: `print("Program 10 start")\nnums = [1,3,5,7]\ncount = 0\nfor n in nums\n    count = count + 1\nprint("Count:", count)\nprint("Program end")`,
    correctCode: `print("Program 10 start")\nnums = [1,3,5,7]\ncount = 0\nfor n in nums:\n    count = count + 1\nprint("Count:", count)\nprint("Program end")`
  },
  {
    id: "q11",
    title: "Debug C Program 11 (Factorial)",
    language: "c",
    buggyCode: `#include <stdio.h>\nint main() {\n    int num = 5, fact = 1\n    for(int i=1;i<=num;i++)\n        fact = fact * i\n    printf("Factorial = %d", fact)\n    return 0\n}`,
    correctCode: `#include <stdio.h>\nint main() {\n    int num = 5, fact = 1;\n    for(int i=1;i<=num;i++)\n        fact = fact * i;\n    printf("Factorial = %d", fact);\n    return 0;\n}`
  },
  {
    id: "q12",
    title: "Debug C Program 12 (Even or Odd)",
    language: "c",
    buggyCode: `#include <stdio.h>\nint main() {\n    int num = 10\n    if(num % 2 == 0)\n        printf("Even")\n    else\n        printf("Odd")\n    return 0\n}`,
    correctCode: `#include <stdio.h>\nint main() {\n    int num = 10;\n    if(num % 2 == 0)\n        printf("Even");\n    else\n        printf("Odd");\n    return 0;\n}`
  },
  {
    id: "q13",
    title: "Debug C Program 13 (Sum of numbers)",
    language: "c",
    buggyCode: `#include <stdio.h>\nint main() {\n    int sum = 0\n    for(int i=1;i<=5;i++)\n        sum = sum + i\n    printf("Sum = %d", sum)\n    return 0\n}`,
    correctCode: `#include <stdio.h>\nint main() {\n    int sum = 0;\n    for(int i=1;i<=5;i++)\n        sum = sum + i;\n    printf("Sum = %d", sum);\n    return 0;\n}`
  },
  {
    id: "q14",
    title: "Debug C Program 14 (Multiplication table)",
    language: "c",
    buggyCode: `#include <stdio.h>\nint main() {\n    int n = 5\n    for(int i=1;i<=10;i++)\n        printf("%d\\n", n*i)\n    return 0\n}`,
    correctCode: `#include <stdio.h>\nint main() {\n    int n = 5;\n    for(int i=1;i<=10;i++)\n        printf("%d\\n", n*i);\n    return 0;\n}`
  },
  {
    id: "q15",
    title: "Debug C Program 15 (Largest number)",
    language: "c",
    buggyCode: `#include <stdio.h>\nint main() {\n    int a=5,b=9,c=3\n    int largest\n    if(a>b && a>c)\n        largest = a\n    else if(b>c)\n        largest = b\n    else\n        largest = c\n    printf("%d", largest)\n    return 0\n}`,
    correctCode: `#include <stdio.h>\nint main() {\n    int a=5,b=9,c=3;\n    int largest;\n    if(a>b && a>c)\n        largest = a;\n    else if(b>c)\n        largest = b;\n    else\n        largest = c;\n    printf("%d", largest);\n    return 0;\n}`
  },
  {
    id: "q16",
    title: "Debug C Program 16 (Reverse number)",
    language: "c",
    buggyCode: `#include <stdio.h>\nint main() {\n    int num=123,rev=0\n    while(num>0)\n    {\n        int d=num%10\n        rev=rev*10+d\n        num=num/10\n    }\n    printf("%d",rev)\n    return 0\n}`,
    correctCode: `#include <stdio.h>\nint main() {\n    int num=123,rev=0;\n    while(num>0)\n    {\n        int d=num%10;\n        rev=rev*10+d;\n        num=num/10;\n    }\n    printf("%d",rev);\n    return 0;\n}`
  },
  
  {
    id: "q17",
    title: "Debug C Program 17 (Palindrome check)",
    language: "c",
    buggyCode: `#include <stdio.h>\nint main() {\n    int num=121,rev=0,temp\n    temp=num\n    while(num>0)\n    {\n        int d=num%10\n        rev=rev*10+d\n        num=num/10\n    }\n    if(temp==rev)\n        printf("Palindrome")\n    else\n        printf("Not Palindrome")\n    return 0\n}`,
    correctCode: `#include <stdio.h>\nint main() {\n    int num=121,rev=0,temp;\n    temp=num;\n    while(num>0)\n    {\n        int d=num%10;\n        rev=rev*10+d;\n        num=num/10;\n    }\n    if(temp==rev)\n        printf("Palindrome");\n    else\n        printf("Not Palindrome");\n    return 0;\n}`
  },
  {
    id: "q18",
    title: "Debug C Program 18 (Prime check)",
    language: "c",
    buggyCode: `#include <stdio.h>\nint main() {\n    int num=7,count=0\n    for(int i=1;i<=num;i++)\n        if(num%i==0)\n            count++\n    if(count==2)\n        printf("Prime")\n    else\n        printf("Not Prime")\n    return 0\n}`,
    correctCode: `#include <stdio.h>\nint main() {\n    int num=7,count=0;\n    for(int i=1;i<=num;i++)\n        if(num%i==0)\n            count++;\n    if(count==2)\n        printf("Prime");\n    else\n        printf("Not Prime");\n    return 0;\n}`
  },
  {
    id: "q19",
    title: "Debug C Program 19 (Array sum)",
    language: "c",
    buggyCode: `#include <stdio.h>\nint main() {\n    int arr[3]={1,2,3}\n    int sum=0\n    for(int i=0;i<3;i++)\n        sum=sum+arr[i]\n    printf("%d",sum)\n    return 0\n}`,
    correctCode: `#include <stdio.h>\nint main() {\n    int arr[3]={1,2,3};\n    int sum=0;\n    for(int i=0;i<3;i++)\n        sum=sum+arr[i];\n    printf("%d",sum);\n    return 0;\n}`
  },
  {
    id: "q20",
    title: "Debug C Program 20 (Fibonacci series)",
    language: "c",
    buggyCode: `#include <stdio.h>\nint main() {\n    int a=0,b=1,c\n    for(int i=1;i<=5;i++)\n    {\n        printf("%d ",a)\n        c=a+b\n        a=b\n        b=c\n    }\n    return 0\n}`,
    correctCode: `#include <stdio.h>\nint main() {\n    int a=0,b=1,c;\n    for(int i=1;i<=5;i++)\n    {\n        printf("%d ",a);\n        c=a+b;\n        a=b;\n        b=c;\n    }\n    return 0;\n}`
  }
];
