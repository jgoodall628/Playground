SubApp.find_or_create_by!(slug: "hello-world") do |app|
  app.name = "Hello World"
  app.description = "A simple greeting screen"
  app.icon = "hand-right-outline"
  app.color = "#4CAF50"
  app.position = 1
end

SubApp.find_or_create_by!(slug: "poker-tracker") do |app|
  app.name = "Poker Tracker"
  app.description = "Track poker sessions and hands"
  app.icon = "card-outline"
  app.color = "#7C3AED"
  app.position = 2
end
