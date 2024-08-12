import kaggle

def get_competitions():
  # Authenticate using the Kaggle API token
  kaggle.api.authenticate()

  # Get a list of active competitions
  competitions = kaggle.api.competitions_list(search="active")

  # Extract relevant information
  competition_data = []
  for competition in competitions:
    competition_data.append({
      'title': competition['title'],
      'description': competition['description'],
      # Add other desired fields
    })


  return competitions
