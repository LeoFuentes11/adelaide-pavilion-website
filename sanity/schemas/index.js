const schemaTypes = [
  { name: 'homepage', title: 'Homepage', type: 'document', fields: [
    { name: 'hero_script', title: 'Hero Script', type: 'string' },
    { name: 'hero_title', title: 'Hero Title', type: 'string' },
    { name: 'hero_subtitle', title: 'Hero Subtitle', type: 'string' },
    { name: 'hero_desc', title: 'Hero Description', type: 'text' },
    { name: 'welcome_subtitle', title: 'Welcome Subtitle', type: 'string' },
    { name: 'welcome_title', title: 'Welcome Title', type: 'string' },
    { name: 'welcome_para1', title: 'Welcome Paragraph 1', type: 'text' },
    { name: 'welcome_para2', title: 'Welcome Paragraph 2', type: 'text' },
    { name: 'testimonials', title: 'Testimonials', type: 'array', of: [{ type: 'testimonial' }] }
  ]},
  { name: 'about', title: 'About', type: 'document', fields: [
    { name: 'hero_title', title: 'Hero Title', type: 'string' },
    { name: 'hero_subtitle', title: 'Hero Subtitle', type: 'string' },
    { name: 'content', title: 'Content', type: 'text' }
  ]},
  { name: 'weddings', title: 'Weddings', type: 'document', fields: [
    { name: 'hero_title', title: 'Hero Title', type: 'string' },
    { name: 'hero_subtitle', title: 'Hero Subtitle', type: 'string' }
  ]},
  { name: 'corporate', title: 'Corporate', type: 'document', fields: [
    { name: 'hero_title', title: 'Hero Title', type: 'string' },
    { name: 'hero_subtitle', title: 'Hero Subtitle', type: 'string' }
  ]},
  { name: 'social', title: 'Social Events', type: 'document', fields: [
    { name: 'hero_title', title: 'Hero Title', type: 'string' },
    { name: 'hero_subtitle', title: 'Hero Subtitle', type: 'string' }
  ]},
  { name: 'packages', title: 'Packages', type: 'document', fields: [
    { name: 'hero_title', title: 'Hero Title', type: 'string' },
    { name: 'hero_subtitle', title: 'Hero Subtitle', type: 'string' }
  ]},
  { name: 'menus', title: 'Menus', type: 'document', fields: [
    { name: 'canapes', title: 'Canapés', type: 'array', of: [{ type: 'menuItem' }] },
    { name: 'alternate', title: 'Alternate', type: 'array', of: [{ type: 'menuItem' }] },
    { name: 'seated', title: 'Seated', type: 'array', of: [{ type: 'menuItem' }] }
  ]},
  { name: 'contact', title: 'Contact', type: 'document', fields: [
    { name: 'phone_display', title: 'Phone Display', type: 'string' },
    { name: 'phone_tel', title: 'Phone Tel', type: 'string' },
    { name: 'email', title: 'Email', type: 'string' },
    { name: 'email_href', title: 'Email Link', type: 'string' },
    { name: 'address_footer', title: 'Address Footer', type: 'text' },
    { name: 'address_full', title: 'Address Full', type: 'text' },
    { name: 'facebook_url', title: 'Facebook URL', type: 'url' },
    { name: 'instagram_url', title: 'Instagram URL', type: 'url' },
    { name: 'maps_url', title: 'Maps URL', type: 'url' }
  ]},
  { name: 'testimonial', title: 'Testimonial', type: 'object', fields: [
    { name: 'quote', title: 'Quote', type: 'text' },
    { name: 'author', title: 'Author', type: 'string' },
    { name: 'event', title: 'Event Type', type: 'string' }
  ]},
  { name: 'menuItem', title: 'Menu Item', type: 'object', fields: [
    { name: 'name', title: 'Name', type: 'string' },
    { name: 'desc', title: 'Description', type: 'text' },
    { name: 'surcharge', title: 'Surcharge', type: 'string' }
  ]}
];

export default schemaTypes;
