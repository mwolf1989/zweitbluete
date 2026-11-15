import { ImageSourcePropType } from 'react-native';

import { ImageKey } from './plans';

// Sources are prepared from ../../../images by tools/prepare_images.py.
export const PLANT_IMAGE: Record<ImageKey, ImageSourcePropType> = {
  'progress-0': require('../../assets/plants/progress-0.png'),
  'progress-1': require('../../assets/plants/progress-1.png'),
  'progress-2': require('../../assets/plants/progress-2.png'),
  'progress-3': require('../../assets/plants/progress-3.png'),
  'progress-4': require('../../assets/plants/progress-4.png'),
  'progress-tomato-unripe': require('../../assets/plants/progress-tomato-unripe.png'),
  'progress-tomato-ripe': require('../../assets/plants/progress-tomato-ripe.png'),
  'progress-chili-unripe': require('../../assets/plants/progress-chili-unripe.png'),
  // No ripe-chili image has been supplied yet; the unripe one stands in.
  'progress-chili-ripe': require('../../assets/plants/progress-chili-unripe.png'),
  'program-basil': require('../../assets/plants/program-basil.png'),
  'program-herbs': require('../../assets/plants/program-herbs.png'),
  'program-lettuce': require('../../assets/plants/program-lettuce.png'),
  'program-vegetables': require('../../assets/plants/program-vegetables.png'),
  'program-tomatoes': require('../../assets/plants/program-tomatoes.png'),
  'program-chilis': require('../../assets/plants/program-chilis.png'),
  'program-lettuce-herbs': require('../../assets/plants/program-lettuce-herbs.png'),
  'program-general': require('../../assets/plants/program-general.png'),
};
