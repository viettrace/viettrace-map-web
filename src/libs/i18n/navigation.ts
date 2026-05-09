import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

const navigation = createNavigation(routing);

// Locale-aware Link wrapper. Export more navigation helpers here when the app needs them.
export const Link = navigation.Link;
