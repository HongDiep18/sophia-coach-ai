- font chữ
- màu system
- ngay chỗ /vocabulary, cái status nên desgin như 1 thanh ngang status
- Design toast mỗi lần alert
- animation project
- feature change voice: as male, female, ...
- Add chatbot for it understand each level english as: A1, B1, B2
- text 'Coach is typing...' at consersation, add animation for it as '...' sẽ nhấp nháy
- khi hết token thì luôn hiển thị toast alert là hết token, không thể đóng nó lại, chỉ được xem
- sửa
- Khi điền mật khẩu: nếu caplock is on, thì display toast warning user
- Kiểm tra có ở đâu bị risk token không
- Ở backend hi code xong sửa backend ở run docker: Gộp docker compose up và npm run dev thành 1 câu lệnh docker chạy luôn npm run dev
- Nên làm hết feature rồi sửa refractor/ hiệu năng, hay là vừa làm xong 1 feature rồi đi chỉnh sửa (do ở đây cũng nên linh động, tại 1 feature
  có khi có nhiều feature con)
- Refractor struct/ folder project theo chuẩn cấu trúc (ví dụ vn-buyer-guide)
- Khi hover 1 word, it will display mean of vietnamese. But if other times, i also want to translate this word, it has to call API lost token again
  Should store the word when I hover in database, if the word has in database, not need call API lost token
