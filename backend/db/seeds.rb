SubApp.find_or_create_by!(slug: "hello-world") do |app|
  app.name = "Hello World"
  app.description = "A simple greeting screen"
  app.icon = "hand-right-outline"
  app.color = "#4CAF50"
  app.position = 1
end
