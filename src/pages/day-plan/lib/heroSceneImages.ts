import { localStorageClient } from '@shared/lib/storage/localStorageClient';

export const COMIC_SCENES = [
  { id: "01-exercise", source: require('../../../../assets/activity-illustrations/protagonist-1/01-exercise-960.webp'), label: 'comicDay.activity.01-exercise' },
  { id: "02-study", source: require('../../../../assets/activity-illustrations/protagonist-1/02-study-960.webp'), label: 'comicDay.activity.02-study' },
  { id: "03-meeting", source: require('../../../../assets/activity-illustrations/protagonist-1/03-meeting-960.webp'), label: 'comicDay.activity.03-meeting' },
  { id: "04-laundry", source: require('../../../../assets/activity-illustrations/protagonist-1/04-laundry-960.webp'), label: 'comicDay.activity.04-laundry' },
  { id: "05-work", source: require('../../../../assets/activity-illustrations/protagonist-1/05-work-960.webp'), label: 'comicDay.activity.05-work' },
  { id: "06-reading", source: require('../../../../assets/activity-illustrations/protagonist-1/06-reading-960.webp'), label: 'comicDay.activity.06-reading' },
  { id: "07-movie-home", source: require('../../../../assets/activity-illustrations/protagonist-1/07-movie-home-960.webp'), label: 'comicDay.activity.07-movie-home' },
  { id: "08-study-hoodie", source: require('../../../../assets/activity-illustrations/protagonist-1/08-study-hoodie-960.webp'), label: 'comicDay.activity.08-study-hoodie' },
  { id: "09-coffee-tablet", source: require('../../../../assets/activity-illustrations/protagonist-1/09-coffee-tablet-960.webp'), label: 'comicDay.activity.09-coffee-tablet' },
  { id: "10-park-walk", source: require('../../../../assets/activity-illustrations/protagonist-1/10-park-walk-960.webp'), label: 'comicDay.activity.10-park-walk' },
  { id: "11-photography", source: require('../../../../assets/activity-illustrations/protagonist-1/11-photography-960.webp'), label: 'comicDay.activity.11-photography' },
  { id: "12-weights", source: require('../../../../assets/activity-illustrations/protagonist-1/12-weights-960.webp'), label: 'comicDay.activity.12-weights' },
  { id: "13-yoga", source: require('../../../../assets/activity-illustrations/protagonist-1/13-yoga-960.webp'), label: 'comicDay.activity.13-yoga' },
  { id: "14-headphone-run", source: require('../../../../assets/activity-illustrations/protagonist-1/14-headphone-run-960.webp'), label: 'comicDay.activity.14-headphone-run' },
  { id: "15-eating", source: require('../../../../assets/activity-illustrations/protagonist-1/15-eating-960.webp'), label: 'comicDay.activity.15-eating' },
  { id: "16-cinema", source: require('../../../../assets/activity-illustrations/protagonist-1/16-cinema-960.webp'), label: 'comicDay.activity.16-cinema' },
  { id: "17-web-browsing", source: require('../../../../assets/activity-illustrations/protagonist-1/17-web-browsing-960.webp'), label: 'comicDay.activity.17-web-browsing' },
  { id: "18-shopping", source: require('../../../../assets/activity-illustrations/protagonist-1/18-shopping-960.webp'), label: 'comicDay.activity.18-shopping' },
  { id: "19-hiking", source: require('../../../../assets/activity-illustrations/protagonist-1/19-hiking-960.webp'), label: 'comicDay.activity.19-hiking' },
  { id: "20-swimming", source: require('../../../../assets/activity-illustrations/protagonist-1/20-swimming-960.webp'), label: 'comicDay.activity.20-swimming' },
  { id: "21-airport-travel", source: require('../../../../assets/activity-illustrations/protagonist-1/21-airport-travel-960.webp'), label: 'comicDay.activity.21-airport-travel' },
  { id: "22-driving", source: require('../../../../assets/activity-illustrations/protagonist-1/22-driving-960.webp'), label: 'comicDay.activity.22-driving' },
  { id: "23-morning-stretch", source: require('../../../../assets/activity-illustrations/protagonist-1/23-morning-stretch-960.webp'), label: 'comicDay.activity.23-morning-stretch' },
  { id: "24-making-bed", source: require('../../../../assets/activity-illustrations/protagonist-1/24-making-bed-960.webp'), label: 'comicDay.activity.24-making-bed' },
  { id: "25-skincare", source: require('../../../../assets/activity-illustrations/protagonist-1/25-skincare-960.webp'), label: 'comicDay.activity.25-skincare' },
  { id: "26-getting-dressed", source: require('../../../../assets/activity-illustrations/protagonist-1/26-getting-dressed-960.webp'), label: 'comicDay.activity.26-getting-dressed' },
  { id: "27-breakfast", source: require('../../../../assets/activity-illustrations/protagonist-1/27-breakfast-960.webp'), label: 'comicDay.activity.27-breakfast' },
  { id: "28-cooking", source: require('../../../../assets/activity-illustrations/protagonist-1/28-cooking-960.webp'), label: 'comicDay.activity.28-cooking' },
  { id: "29-dishes", source: require('../../../../assets/activity-illustrations/protagonist-1/29-dishes-960.webp'), label: 'comicDay.activity.29-dishes' },
  { id: "30-vacuuming", source: require('../../../../assets/activity-illustrations/protagonist-1/30-vacuuming-960.webp'), label: 'comicDay.activity.30-vacuuming' },
  { id: "31-organizing-closet", source: require('../../../../assets/activity-illustrations/protagonist-1/31-organizing-closet-960.webp'), label: 'comicDay.activity.31-organizing-closet' },
  { id: "32-watering-plants", source: require('../../../../assets/activity-illustrations/protagonist-1/32-watering-plants-960.webp'), label: 'comicDay.activity.32-watering-plants' },
  { id: "33-grocery-shopping", source: require('../../../../assets/activity-illustrations/protagonist-1/33-grocery-shopping-960.webp'), label: 'comicDay.activity.33-grocery-shopping' },
  { id: "34-subway-commute", source: require('../../../../assets/activity-illustrations/protagonist-1/34-subway-commute-960.webp'), label: 'comicDay.activity.34-subway-commute' },
  { id: "35-bus-ride", source: require('../../../../assets/activity-illustrations/protagonist-1/35-bus-ride-960.webp'), label: 'comicDay.activity.35-bus-ride' },
  { id: "36-cycling", source: require('../../../../assets/activity-illustrations/protagonist-1/36-cycling-960.webp'), label: 'comicDay.activity.36-cycling' },
  { id: "37-journaling", source: require('../../../../assets/activity-illustrations/protagonist-1/37-journaling-960.webp'), label: 'comicDay.activity.37-journaling' },
  { id: "38-listening-music", source: require('../../../../assets/activity-illustrations/protagonist-1/38-listening-music-960.webp'), label: 'comicDay.activity.38-listening-music' },
  { id: "39-piano-practice", source: require('../../../../assets/activity-illustrations/protagonist-1/39-piano-practice-960.webp'), label: 'comicDay.activity.39-piano-practice' },
  { id: "40-video-call", source: require('../../../../assets/activity-illustrations/protagonist-1/40-video-call-960.webp'), label: 'comicDay.activity.40-video-call' },
  { id: "41-pet-walk", source: require('../../../../assets/activity-illustrations/protagonist-1/41-pet-walk-960.webp'), label: 'comicDay.activity.41-pet-walk' },
  { id: "42-meditation", source: require('../../../../assets/activity-illustrations/protagonist-1/42-meditation-960.webp'), label: 'comicDay.activity.42-meditation' },
  { id: "43-sketching", source: require('../../../../assets/activity-illustrations/protagonist-1/43-sketching-960.webp'), label: 'comicDay.activity.43-sketching' },
  { id: "44-baking", source: require('../../../../assets/activity-illustrations/protagonist-1/44-baking-960.webp'), label: 'comicDay.activity.44-baking' },
  { id: "45-board-game", source: require('../../../../assets/activity-illustrations/protagonist-1/45-board-game-960.webp'), label: 'comicDay.activity.45-board-game' },
  { id: "46-camping", source: require('../../../../assets/activity-illustrations/protagonist-1/46-camping-960.webp'), label: 'comicDay.activity.46-camping' },
  { id: "47-fold-laundry", source: require('../../../../assets/activity-illustrations/protagonist-1/47-fold-laundry-960.webp'), label: 'comicDay.activity.47-fold-laundry' },
  { id: "48-recycling", source: require('../../../../assets/activity-illustrations/protagonist-1/48-recycling-960.webp'), label: 'comicDay.activity.48-recycling' },
  { id: "49-guitar", source: require('../../../../assets/activity-illustrations/protagonist-1/49-guitar-960.webp'), label: 'comicDay.activity.49-guitar' },
  { id: "50-nap", source: require('../../../../assets/activity-illustrations/protagonist-1/50-nap-960.webp'), label: 'comicDay.activity.50-nap' },
  { id: "51-sleeping-in-bed", source: require('../../../../assets/activity-illustrations/protagonist-1/51-sleeping-in-bed-960.webp'), label: 'comicDay.activity.51-sleeping-in-bed' },
  { id: "52-reading-cafe", source: require('../../../../assets/activity-illustrations/protagonist-1/52-reading-cafe-960.webp'), label: 'comicDay.activity.52-reading-cafe' },
  { id: "53-diary-in-bed", source: require('../../../../assets/activity-illustrations/protagonist-1/53-diary-in-bed-960.webp'), label: 'comicDay.activity.53-diary-in-bed' },
  { id: "54-seaside-trip", source: require('../../../../assets/activity-illustrations/protagonist-1/54-seaside-trip-960.webp'), label: 'comicDay.activity.54-seaside-trip' },
  { id: "55-window-magazine", source: require('../../../../assets/activity-illustrations/protagonist-1/55-window-magazine-960.webp'), label: 'comicDay.activity.55-window-magazine' },
  { id: "56-bookstore", source: require('../../../../assets/activity-illustrations/protagonist-1/56-bookstore-960.webp'), label: 'comicDay.activity.56-bookstore' },
  { id: "57-blue-bottle-cafe", source: require('../../../../assets/activity-illustrations/protagonist-1/57-blue-bottle-cafe-960.webp'), label: 'comicDay.activity.57-blue-bottle-cafe' },
  { id: "58-aquarium-visit", source: require('../../../../assets/activity-illustrations/protagonist-1/58-aquarium-visit-960.webp'), label: 'comicDay.activity.58-aquarium-visit' },
  { id: "59-pottery-studio", source: require('../../../../assets/activity-illustrations/protagonist-1/59-pottery-studio-960.webp'), label: 'comicDay.activity.59-pottery-studio' },
  { id: "60-origami-cranes", source: require('../../../../assets/activity-illustrations/protagonist-1/60-origami-cranes-960.webp'), label: 'comicDay.activity.60-origami-cranes' },
  { id: "61-rainy-window", source: require('../../../../assets/activity-illustrations/protagonist-1/61-rainy-window-960.webp'), label: 'comicDay.activity.61-rainy-window' },
  { id: "62-windblown-umbrella", source: require('../../../../assets/activity-illustrations/protagonist-1/62-windblown-umbrella-960.webp'), label: 'comicDay.activity.62-windblown-umbrella' },
  { id: "63-delayed-train", source: require('../../../../assets/activity-illustrations/protagonist-1/63-delayed-train-960.webp'), label: 'comicDay.activity.63-delayed-train' },
  { id: "64-vintage-shop", source: require('../../../../assets/activity-illustrations/protagonist-1/64-vintage-shop-960.webp'), label: 'comicDay.activity.64-vintage-shop' },
  { id: "65-florist-shopping", source: require('../../../../assets/activity-illustrations/protagonist-1/65-florist-shopping-960.webp'), label: 'comicDay.activity.65-florist-shopping' },
  { id: "66-arranging-bouquet", source: require('../../../../assets/activity-illustrations/protagonist-1/66-arranging-bouquet-960.webp'), label: 'comicDay.activity.66-arranging-bouquet' },
  { id: "67-sewing-button", source: require('../../../../assets/activity-illustrations/protagonist-1/67-sewing-button-960.webp'), label: 'comicDay.activity.67-sewing-button' },
  { id: "68-knitting-scarf", source: require('../../../../assets/activity-illustrations/protagonist-1/68-knitting-scarf-960.webp'), label: 'comicDay.activity.68-knitting-scarf' },
  { id: "69-tea-ceremony", source: require('../../../../assets/activity-illustrations/protagonist-1/69-tea-ceremony-960.webp'), label: 'comicDay.activity.69-tea-ceremony' },
  { id: "70-baking-bread", source: require('../../../../assets/activity-illustrations/protagonist-1/70-baking-bread-960.webp'), label: 'comicDay.activity.70-baking-bread' },
  { id: "71-street-food", source: require('../../../../assets/activity-illustrations/protagonist-1/71-street-food-960.webp'), label: 'comicDay.activity.71-street-food' },
  { id: "72-spicy-noodles", source: require('../../../../assets/activity-illustrations/protagonist-1/72-spicy-noodles-960.webp'), label: 'comicDay.activity.72-spicy-noodles' },
  { id: "73-midnight-convenience", source: require('../../../../assets/activity-illustrations/protagonist-1/73-midnight-convenience-960.webp'), label: 'comicDay.activity.73-midnight-convenience' },
  { id: "74-assemble-furniture", source: require('../../../../assets/activity-illustrations/protagonist-1/74-assemble-furniture-960.webp'), label: 'comicDay.activity.74-assemble-furniture' },
  { id: "75-fix-drawer", source: require('../../../../assets/activity-illustrations/protagonist-1/75-fix-drawer-960.webp'), label: 'comicDay.activity.75-fix-drawer' },
  { id: "76-repot-plant", source: require('../../../../assets/activity-illustrations/protagonist-1/76-repot-plant-960.webp'), label: 'comicDay.activity.76-repot-plant' },
  { id: "77-feed-balcony-birds", source: require('../../../../assets/activity-illustrations/protagonist-1/77-feed-balcony-birds-960.webp'), label: 'comicDay.activity.77-feed-balcony-birds' },
  { id: "78-polish-shoes", source: require('../../../../assets/activity-illustrations/protagonist-1/78-polish-shoes-960.webp'), label: 'comicDay.activity.78-polish-shoes' },
  { id: "79-puddle-jumping", source: require('../../../../assets/activity-illustrations/protagonist-1/79-puddle-jumping-960.webp'), label: 'comicDay.activity.79-puddle-jumping' },
  { id: "80-build-snowman", source: require('../../../../assets/activity-illustrations/protagonist-1/80-build-snowman-960.webp'), label: 'comicDay.activity.80-build-snowman' },
  { id: "81-sandcastle", source: require('../../../../assets/activity-illustrations/protagonist-1/81-sandcastle-960.webp'), label: 'comicDay.activity.81-sandcastle' },
  { id: "82-ferry-deck", source: require('../../../../assets/activity-illustrations/protagonist-1/82-ferry-deck-960.webp'), label: 'comicDay.activity.82-ferry-deck' },
  { id: "83-train-window", source: require('../../../../assets/activity-illustrations/protagonist-1/83-train-window-960.webp'), label: 'comicDay.activity.83-train-window' },
  { id: "84-lost-map", source: require('../../../../assets/activity-illustrations/protagonist-1/84-lost-map-960.webp'), label: 'comicDay.activity.84-lost-map' },
  { id: "85-postcard", source: require('../../../../assets/activity-illustrations/protagonist-1/85-postcard-960.webp'), label: 'comicDay.activity.85-postcard' },
  { id: "86-hotel-breakfast", source: require('../../../../assets/activity-illustrations/protagonist-1/86-hotel-breakfast-960.webp'), label: 'comicDay.activity.86-hotel-breakfast' },
  { id: "87-planetarium", source: require('../../../../assets/activity-illustrations/protagonist-1/87-planetarium-960.webp'), label: 'comicDay.activity.87-planetarium' },
  { id: "88-art-museum", source: require('../../../../assets/activity-illustrations/protagonist-1/88-art-museum-960.webp'), label: 'comicDay.activity.88-art-museum' },
  { id: "89-jazz-concert", source: require('../../../../assets/activity-illustrations/protagonist-1/89-jazz-concert-960.webp'), label: 'comicDay.activity.89-jazz-concert' },
  { id: "90-arcade-claw-machine", source: require('../../../../assets/activity-illustrations/protagonist-1/90-arcade-claw-machine-960.webp'), label: 'comicDay.activity.90-arcade-claw-machine' },
  { id: "91-karaoke", source: require('../../../../assets/activity-illustrations/protagonist-1/91-karaoke-960.webp'), label: 'comicDay.activity.91-karaoke' },
  { id: "92-bowling", source: require('../../../../assets/activity-illustrations/protagonist-1/92-bowling-960.webp'), label: 'comicDay.activity.92-bowling' },
  { id: "93-badminton", source: require('../../../../assets/activity-illustrations/protagonist-1/93-badminton-960.webp'), label: 'comicDay.activity.93-badminton' },
  { id: "94-roller-skating", source: require('../../../../assets/activity-illustrations/protagonist-1/94-roller-skating-960.webp'), label: 'comicDay.activity.94-roller-skating' },
  { id: "95-picnic", source: require('../../../../assets/activity-illustrations/protagonist-1/95-picnic-960.webp'), label: 'comicDay.activity.95-picnic' },
  { id: "96-feed-ducks", source: require('../../../../assets/activity-illustrations/protagonist-1/96-feed-ducks-960.webp'), label: 'comicDay.activity.96-feed-ducks' },
  { id: "97-fly-kite", source: require('../../../../assets/activity-illustrations/protagonist-1/97-fly-kite-960.webp'), label: 'comicDay.activity.97-fly-kite' },
  { id: "98-telescope-stargazing", source: require('../../../../assets/activity-illustrations/protagonist-1/98-telescope-stargazing-960.webp'), label: 'comicDay.activity.98-telescope-stargazing' },
  { id: "99-watch-fireworks", source: require('../../../../assets/activity-illustrations/protagonist-1/99-watch-fireworks-960.webp'), label: 'comicDay.activity.99-watch-fireworks' },
  { id: "100-kitchen-dance", source: require('../../../../assets/activity-illustrations/protagonist-1/100-kitchen-dance-960.webp'), label: 'comicDay.activity.100-kitchen-dance' },
  { id: "101-hairbrush-singing", source: require('../../../../assets/activity-illustrations/protagonist-1/101-hairbrush-singing-960.webp'), label: 'comicDay.activity.101-hairbrush-singing' },
  { id: "102-homemade-ice-cream", source: require('../../../../assets/activity-illustrations/protagonist-1/102-homemade-ice-cream-960.webp'), label: 'comicDay.activity.102-homemade-ice-cream' },
  { id: "103-decorate-cake", source: require('../../../../assets/activity-illustrations/protagonist-1/103-decorate-cake-960.webp'), label: 'comicDay.activity.103-decorate-cake' },
  { id: "104-jigsaw-puzzle", source: require('../../../../assets/activity-illustrations/protagonist-1/104-jigsaw-puzzle-960.webp'), label: 'comicDay.activity.104-jigsaw-puzzle' },
  { id: "105-play-with-cat", source: require('../../../../assets/activity-illustrations/protagonist-1/105-play-with-cat-960.webp'), label: 'comicDay.activity.105-play-with-cat' },
  { id: "106-duvet-cover", source: require('../../../../assets/activity-illustrations/protagonist-1/106-duvet-cover-960.webp'), label: 'comicDay.activity.106-duvet-cover' },
  { id: "107-brunch-friends", source: require('../../../../assets/activity-illustrations/protagonist-1/107-brunch-friends-960.webp'), label: 'comicDay.activity.107-brunch-friends' },
  { id: "108-hotpot-friends", source: require('../../../../assets/activity-illustrations/protagonist-1/108-hotpot-friends-960.webp'), label: 'comicDay.activity.108-hotpot-friends' },
  { id: "109-photo-booth-friends", source: require('../../../../assets/activity-illustrations/protagonist-1/109-photo-booth-friends-960.webp'), label: 'comicDay.activity.109-photo-booth-friends' },
  { id: "110-pottery-painting-friends", source: require('../../../../assets/activity-illustrations/protagonist-1/110-pottery-painting-friends-960.webp'), label: 'comicDay.activity.110-pottery-painting-friends' },
  { id: "111-rooftop-picnic-friends", source: require('../../../../assets/activity-illustrations/protagonist-1/111-rooftop-picnic-friends-960.webp'), label: 'comicDay.activity.111-rooftop-picnic-friends' },
  { id: "112-hair-salon", source: require('../../../../assets/activity-illustrations/protagonist-1/112-hair-salon-960.webp'), label: 'comicDay.activity.112-hair-salon' },
  { id: "113-grow-herbs", source: require('../../../../assets/activity-illustrations/protagonist-1/113-grow-herbs-960.webp'), label: 'comicDay.activity.113-grow-herbs' },
  { id: "114-make-dumplings", source: require('../../../../assets/activity-illustrations/protagonist-1/114-make-dumplings-960.webp'), label: 'comicDay.activity.114-make-dumplings' },
  { id: "115-office-cafeteria", source: require('../../../../assets/activity-illustrations/protagonist-1/115-office-cafeteria-960.webp'), label: 'comicDay.activity.115-office-cafeteria' },
  { id: "116-morning-jog-friend", source: require('../../../../assets/activity-illustrations/protagonist-1/116-morning-jog-friend-960.webp'), label: 'comicDay.activity.116-morning-jog-friend' },
  { id: "117-charades-friends", source: require('../../../../assets/activity-illustrations/protagonist-1/117-charades-friends-960.webp'), label: 'comicDay.activity.117-charades-friends' },
  { id: "118-night-market-friends", source: require('../../../../assets/activity-illustrations/protagonist-1/118-night-market-friends-960.webp'), label: 'comicDay.activity.118-night-market-friends' },
  { id: "119-market-produce-friend", source: require('../../../../assets/activity-illustrations/protagonist-1/119-market-produce-friend-960.webp'), label: 'comicDay.activity.119-market-produce-friend' },
  { id: "120-share-umbrella-friends", source: require('../../../../assets/activity-illustrations/protagonist-1/120-share-umbrella-friends-960.webp'), label: 'comicDay.activity.120-share-umbrella-friends' },
  { id: "121-wrap-housewarming-gift", source: require('../../../../assets/activity-illustrations/protagonist-1/121-wrap-housewarming-gift-960.webp'), label: 'comicDay.activity.121-wrap-housewarming-gift' },
  { id: "122-watercolor-park", source: require('../../../../assets/activity-illustrations/protagonist-1/122-watercolor-park-960.webp'), label: 'comicDay.activity.122-watercolor-park' },
  { id: "123-frisbee-friends", source: require('../../../../assets/activity-illustrations/protagonist-1/123-frisbee-friends-960.webp'), label: 'comicDay.activity.123-frisbee-friends' },
  { id: "124-ferry-friends", source: require('../../../../assets/activity-illustrations/protagonist-1/124-ferry-friends-960.webp'), label: 'comicDay.activity.124-ferry-friends' },
  { id: "125-table-tennis-coworker", source: require('../../../../assets/activity-illustrations/protagonist-1/125-table-tennis-coworker-960.webp'), label: 'comicDay.activity.125-table-tennis-coworker' },
  { id: "126-beach-volleyball-friends", source: require('../../../../assets/activity-illustrations/protagonist-1/126-beach-volleyball-friends-960.webp'), label: 'comicDay.activity.126-beach-volleyball-friends' },
  { id: "127-rainy-bus-stop", source: require('../../../../assets/activity-illustrations/protagonist-1/127-rainy-bus-stop-960.webp'), label: 'comicDay.activity.127-rainy-bus-stop' },
  { id: "128-arcade-race-friends", source: require('../../../../assets/activity-illustrations/protagonist-1/128-arcade-race-friends-960.webp'), label: 'comicDay.activity.128-arcade-race-friends' },
  { id: "129-thrift-shop-friends", source: require('../../../../assets/activity-illustrations/protagonist-1/129-thrift-shop-friends-960.webp'), label: 'comicDay.activity.129-thrift-shop-friends' },
  { id: "130-dog-cafe-friends", source: require('../../../../assets/activity-illustrations/protagonist-1/130-dog-cafe-friends-960.webp'), label: 'comicDay.activity.130-dog-cafe-friends' },
  { id: "131-campfire-friends", source: require('../../../../assets/activity-illustrations/protagonist-1/131-campfire-friends-960.webp'), label: 'comicDay.activity.131-campfire-friends' },
  { id: "132-pancake-flip", source: require('../../../../assets/activity-illustrations/protagonist-1/132-pancake-flip-960.webp'), label: 'comicDay.activity.132-pancake-flip' },
  { id: "133-potluck-coworkers", source: require('../../../../assets/activity-illustrations/protagonist-1/133-potluck-coworkers-960.webp'), label: 'comicDay.activity.133-potluck-coworkers' },
  { id: "134-greenhouse-gardening", source: require('../../../../assets/activity-illustrations/protagonist-1/134-greenhouse-gardening-960.webp'), label: 'comicDay.activity.134-greenhouse-gardening' },
  { id: "135-flower-garland-friends", source: require('../../../../assets/activity-illustrations/protagonist-1/135-flower-garland-friends-960.webp'), label: 'comicDay.activity.135-flower-garland-friends' },
  { id: "136-furniture-shopping-friend", source: require('../../../../assets/activity-illustrations/protagonist-1/136-furniture-shopping-friend-960.webp'), label: 'comicDay.activity.136-furniture-shopping-friend' },
  { id: "137-taiyaki-stall", source: require('../../../../assets/activity-illustrations/protagonist-1/137-taiyaki-stall-960.webp'), label: 'comicDay.activity.137-taiyaki-stall' },
  { id: "138-shells-beach-friend", source: require('../../../../assets/activity-illustrations/protagonist-1/138-shells-beach-friend-960.webp'), label: 'comicDay.activity.138-shells-beach-friend' },
  { id: "139-flea-market-friends", source: require('../../../../assets/activity-illustrations/protagonist-1/139-flea-market-friends-960.webp'), label: 'comicDay.activity.139-flea-market-friends' },
  { id: "140-fruit-tart-cafe-friends", source: require('../../../../assets/activity-illustrations/protagonist-1/140-fruit-tart-cafe-friends-960.webp'), label: 'comicDay.activity.140-fruit-tart-cafe-friends' },
  { id: "141-library-book-return", source: require('../../../../assets/activity-illustrations/protagonist-1/141-library-book-return-960.webp'), label: 'comicDay.activity.141-library-book-return' },
  { id: "142-community-garden-friend", source: require('../../../../assets/activity-illustrations/protagonist-1/142-community-garden-friend-960.webp'), label: 'comicDay.activity.142-community-garden-friend' },
  { id: "143-doubles-table-tennis", source: require('../../../../assets/activity-illustrations/protagonist-1/143-doubles-table-tennis-960.webp'), label: 'comicDay.activity.143-doubles-table-tennis' },
  { id: "144-fix-bike-tire", source: require('../../../../assets/activity-illustrations/protagonist-1/144-fix-bike-tire-960.webp'), label: 'comicDay.activity.144-fix-bike-tire' },
  { id: "145-cycle-friend", source: require('../../../../assets/activity-illustrations/protagonist-1/145-cycle-friend-960.webp'), label: 'comicDay.activity.145-cycle-friend' },
  { id: "146-coffee-after-walk-friends", source: require('../../../../assets/activity-illustrations/protagonist-1/146-coffee-after-walk-friends-960.webp'), label: 'comicDay.activity.146-coffee-after-walk-friends' },
  { id: "147-help-friend-move", source: require('../../../../assets/activity-illustrations/protagonist-1/147-help-friend-move-960.webp'), label: 'comicDay.activity.147-help-friend-move' },
  { id: "148-birthday-surprise", source: require('../../../../assets/activity-illustrations/protagonist-1/148-birthday-surprise-960.webp'), label: 'comicDay.activity.148-birthday-surprise' },
  { id: "149-subway-boarding", source: require('../../../../assets/activity-illustrations/protagonist-1/149-subway-boarding-960.webp'), label: 'comicDay.activity.149-subway-boarding' },
  { id: "150-too-many-groceries", source: require('../../../../assets/activity-illustrations/protagonist-1/150-too-many-groceries-960.webp'), label: 'comicDay.activity.150-too-many-groceries' },
  { id: "151-pizza-making-friends", source: require('../../../../assets/activity-illustrations/protagonist-1/151-pizza-making-friends-960.webp'), label: 'comicDay.activity.151-pizza-making-friends' },
  { id: "152-paint-old-chair", source: require('../../../../assets/activity-illustrations/protagonist-1/152-paint-old-chair-960.webp'), label: 'comicDay.activity.152-paint-old-chair' },
  { id: "153-jigsaw-friends", source: require('../../../../assets/activity-illustrations/protagonist-1/153-jigsaw-friends-960.webp'), label: 'comicDay.activity.153-jigsaw-friends' },
  { id: "154-bakery-queue", source: require('../../../../assets/activity-illustrations/protagonist-1/154-bakery-queue-960.webp'), label: 'comicDay.activity.154-bakery-queue' },
  { id: "155-evening-walk-neighbor", source: require('../../../../assets/activity-illustrations/protagonist-1/155-evening-walk-neighbor-960.webp'), label: 'comicDay.activity.155-evening-walk-neighbor' },
  { id: "156-desk-nap", source: require('../../../../assets/activity-illustrations/protagonist-1/156-desk-nap-960.webp'), label: 'comicDay.activity.156-desk-nap' },
  { id: "157-starbucks-cafe", source: require('../../../../assets/activity-illustrations/protagonist-1/157-starbucks-cafe-960.webp'), label: 'comicDay.activity.157-starbucks-cafe' },
  { id: 'puppy-ball-play', source: require('../../../../assets/activity-illustrations/puppy/puppy-ball-play-960.webp'), label: 'comicDay.puppy.ball-play' },
  { id: 'puppy-park-walk', source: require('../../../../assets/activity-illustrations/puppy/puppy-park-walk-960.webp'), label: 'comicDay.puppy.park-walk' },
  { id: 'puppy-nap', source: require('../../../../assets/activity-illustrations/puppy/puppy-nap-960.webp'), label: 'comicDay.puppy.nap' },
  { id: 'puppy-meal', source: require('../../../../assets/activity-illustrations/puppy/puppy-meal-960.webp'), label: 'comicDay.puppy.meal' },
  { id: 'puppy-water', source: require('../../../../assets/activity-illustrations/puppy/puppy-water-960.webp'), label: 'comicDay.puppy.water' },
  { id: 'puppy-treat', source: require('../../../../assets/activity-illustrations/puppy/puppy-treat-960.webp'), label: 'comicDay.puppy.treat' },
  { id: 'puppy-bath', source: require('../../../../assets/activity-illustrations/puppy/puppy-bath-960.webp'), label: 'comicDay.puppy.bath' },
  { id: 'puppy-towel', source: require('../../../../assets/activity-illustrations/puppy/puppy-towel-960.webp'), label: 'comicDay.puppy.towel' },
  { id: 'puppy-window-watch', source: require('../../../../assets/activity-illustrations/puppy/puppy-window-watch-960.webp'), label: 'comicDay.puppy.window-watch' },
  { id: 'puppy-fetch', source: require('../../../../assets/activity-illustrations/puppy/puppy-fetch-960.webp'), label: 'comicDay.puppy.fetch' },
  { id: 'puppy-grass-sniff', source: require('../../../../assets/activity-illustrations/puppy/puppy-grass-sniff-960.webp'), label: 'comicDay.puppy.grass-sniff' },
  { id: 'puppy-stretch', source: require('../../../../assets/activity-illustrations/puppy/puppy-stretch-960.webp'), label: 'comicDay.puppy.stretch' },
  { id: 'puppy-wait-door', source: require('../../../../assets/activity-illustrations/puppy/puppy-wait-door-960.webp'), label: 'comicDay.puppy.wait-door' },
  { id: 'puppy-car-ride', source: require('../../../../assets/activity-illustrations/puppy/puppy-car-ride-960.webp'), label: 'comicDay.puppy.car-ride' },
  { id: 'puppy-seaside', source: require('../../../../assets/activity-illustrations/puppy/puppy-seaside-960.webp'), label: 'comicDay.puppy.seaside' },
] as const;
export type ComicSceneId = typeof COMIC_SCENES[number]['id'];
/** Short ids that were byte-identical copies of the numbered scenes. */
const LEGACY_SCENE_IDS: Record<string, ComicSceneId> = {
  wake: '23-morning-stretch',
  breakfast: '27-breakfast',
  focus: '05-work',
  walk: '10-park-walk',
  read: '06-reading',
};
export function canonicalComicSceneId(value: unknown): ComicSceneId | null {
  const id = typeof value === 'string' ? LEGACY_SCENE_IDS[value] ?? value : value;
  return COMIC_SCENES.some(scene => scene.id === id) ? id as ComicSceneId : null;
}
const STORAGE_KEY = 'pokit:comic-scene-images';
export function loadComicScenes(): Record<string, ComicSceneId> {
  try {
    const raw: unknown = JSON.parse(localStorageClient.getItemRaw(STORAGE_KEY) ?? '{}');
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    return Object.fromEntries(Object.entries(raw).flatMap(([key, value]) => {
      const id = canonicalComicSceneId(value);
      return id ? [[key, id] as const] : [];
    }));
  } catch { return {}; }
}
export function saveComicScene(key: string, scene: ComicSceneId) {
  const next = { ...loadComicScenes(), [key]: scene };
  localStorageClient.setItemRaw(STORAGE_KEY, JSON.stringify(next));
  return next;
}
export function resolveComicScene(key: string, label: string, choices: Record<string, ComicSceneId>) {
  const chosen = COMIC_SCENES.find(scene => scene.id === choices[key]);
  if (chosen) return chosen;
  const text = `${key} ${label}`.toLowerCase();
  if (/read|book|독서|책|読書/.test(text)) return sceneById('06-reading');
  if (/walk|run|exercise|산책|러닝|운동|스트레칭|散歩/.test(text)) return sceneById('10-park-walk');
  if (/breakfast|meal|food|아침|식사|섭취|복용|朝食/.test(text)) return sceneById('27-breakfast');
  if (/wake|sleep|기상|수면|起床/.test(text)) return sceneById('23-morning-stretch');
  return sceneById('05-work');
}
function sceneById(id: ComicSceneId) {
  return COMIC_SCENES.find(scene => scene.id === id) ?? COMIC_SCENES[0];
}

/** Activity-based categories for both character collections. Overlap is intentional. */
export const COMIC_SCENE_CATEGORIES = [
  { id: 'all', label: 'comicDay.all' },
  { id: 'preparation', label: 'comicDay.category.preparation' },
  { id: 'food', label: 'comicDay.category.food' },
  { id: 'cafe', label: 'comicDay.category.cafe' },
  { id: 'work', label: 'comicDay.category.work' },
  { id: 'exercise', label: 'comicDay.category.exercise' },
  { id: 'outdoors', label: 'comicDay.category.outdoors' },
  { id: 'home', label: 'comicDay.category.home' },
  { id: 'travel', label: 'comicDay.category.travel' },
  { id: 'shopping', label: 'comicDay.category.shopping' },
  { id: 'hobbies', label: 'comicDay.category.hobbies' },
  { id: 'rest', label: 'comicDay.category.rest' },
] as const;
export type ComicSceneCategory = typeof COMIC_SCENE_CATEGORIES[number]['id'];
const CATEGORY_IMAGES = {
  preparation: ["23-morning-stretch", "24-making-bed", "25-skincare", "26-getting-dressed", "101-hairbrush-singing", "112-hair-salon", "116-morning-jog-friend"],
  food: ["15-eating", "27-breakfast", "28-cooking", "44-baking", "70-baking-bread", "71-street-food", "72-spicy-noodles", "73-midnight-convenience", "86-hotel-breakfast", "102-homemade-ice-cream", "103-decorate-cake", "107-brunch-friends", "108-hotpot-friends", "114-make-dumplings", "115-office-cafeteria", "119-market-produce-friend", "132-pancake-flip", "137-taiyaki-stall", "140-fruit-tart-cafe-friends", "151-pizza-making-friends", "154-bakery-queue", "puppy-meal", "puppy-water", "puppy-treat"],
  cafe: ["09-coffee-tablet", "52-reading-cafe", "57-blue-bottle-cafe", "69-tea-ceremony", "115-office-cafeteria", "130-dog-cafe-friends", "140-fruit-tart-cafe-friends", "146-coffee-after-walk-friends", "157-starbucks-cafe"],
  work: ["02-study", "03-meeting", "05-work", "08-study-hoodie", "17-web-browsing", "40-video-call", "99-watch-fireworks", "115-office-cafeteria", "125-table-tennis-coworker", "133-potluck-coworkers"],
  exercise: ["01-exercise", "12-weights", "13-yoga", "14-headphone-run", "19-hiking", "20-swimming", "23-morning-stretch", "36-cycling", "48-recycling", "92-bowling", "93-badminton", "94-roller-skating", "100-kitchen-dance", "107-brunch-friends", "116-morning-jog-friend", "123-frisbee-friends", "125-table-tennis-coworker", "126-beach-volleyball-friends", "143-doubles-table-tennis", "puppy-ball-play", "puppy-fetch", "puppy-stretch"],
  outdoors: ["10-park-walk", "32-watering-plants", "41-pet-walk", "46-camping", "54-seaside-trip", "58-aquarium-visit", "76-repot-plant", "77-feed-balcony-birds", "79-puddle-jumping", "80-build-snowman", "81-sandcastle", "82-ferry-deck", "95-picnic", "96-feed-ducks", "97-fly-kite", "98-telescope-stargazing", "99-watch-fireworks", "111-rooftop-picnic-friends", "122-watercolor-park", "124-ferry-friends", "126-beach-volleyball-friends", "134-greenhouse-gardening", "138-shells-beach-friend", "142-community-garden-friend", "146-coffee-after-walk-friends", "155-evening-walk-neighbor", "puppy-park-walk", "puppy-grass-sniff", "puppy-seaside"],
  home: ["04-laundry", "07-movie-home", "24-making-bed", "25-skincare", "29-dishes", "30-vacuuming", "31-organizing-closet", "32-watering-plants", "47-fold-laundry", "48-recycling", "60-origami-cranes", "67-sewing-button", "68-knitting-scarf", "74-assemble-furniture", "75-fix-drawer", "76-repot-plant", "77-feed-balcony-birds", "78-polish-shoes", "102-homemade-ice-cream", "105-play-with-cat", "106-duvet-cover", "135-flower-garland-friends", "136-furniture-shopping-friend", "144-fix-bike-tire", "147-help-friend-move", "puppy-bath", "puppy-towel", "puppy-window-watch", "puppy-wait-door"],
  travel: ["21-airport-travel", "22-driving", "34-subway-commute", "35-bus-ride", "62-windblown-umbrella", "63-delayed-train", "82-ferry-deck", "83-train-window", "84-lost-map", "85-postcard", "86-hotel-breakfast", "120-share-umbrella-friends", "124-ferry-friends", "127-rainy-bus-stop", "147-help-friend-move", "149-subway-boarding", "puppy-car-ride", "puppy-seaside"],
  shopping: ["18-shopping", "33-grocery-shopping", "56-bookstore", "64-vintage-shop", "65-florist-shopping", "118-night-market-friends", "119-market-produce-friend", "129-thrift-shop-friends", "136-furniture-shopping-friend", "139-flea-market-friends", "154-bakery-queue"],
  hobbies: ["06-reading", "07-movie-home", "11-photography", "16-cinema", "37-journaling", "38-listening-music", "39-piano-practice", "43-sketching", "45-board-game", "49-guitar", "52-reading-cafe", "53-diary-in-bed", "59-pottery-studio", "60-origami-cranes", "66-arranging-bouquet", "67-sewing-button", "68-knitting-scarf", "69-tea-ceremony", "85-postcard", "87-planetarium", "88-art-museum", "89-jazz-concert", "90-arcade-claw-machine", "91-karaoke", "101-hairbrush-singing", "104-jigsaw-puzzle", "109-photo-booth-friends", "110-pottery-painting-friends", "113-grow-herbs", "117-charades-friends", "121-wrap-housewarming-gift", "122-watercolor-park", "128-arcade-race-friends", "131-campfire-friends", "141-library-book-return", "145-cycle-friend", "148-birthday-surprise", "150-too-many-groceries", "152-paint-old-chair", "153-jigsaw-friends", "puppy-ball-play", "puppy-fetch"],
  rest: ["06-reading", "07-movie-home", "16-cinema", "42-meditation", "50-nap", "51-sleeping-in-bed", "52-reading-cafe", "55-window-magazine", "61-rainy-window", "83-train-window", "98-telescope-stargazing", "99-watch-fireworks", "127-rainy-bus-stop", "156-desk-nap", "puppy-nap", "puppy-window-watch"],
} satisfies Record<Exclude<ComicSceneCategory, 'all'>, readonly ComicSceneId[]>;
export function comicSceneMatchesCategory(id: ComicSceneId, category: ComicSceneCategory): boolean {
  return category === 'all' || (CATEGORY_IMAGES[category] as readonly ComicSceneId[]).includes(id);
}
