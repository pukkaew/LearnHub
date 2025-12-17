const fs = require('fs');
const path = 'D:/App/LearnHub/views/organization/create-position.ejs';

let content = fs.readFileSync(path, 'utf8');

const newField = `
                        <!-- Position Name EN -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">
                                <%= t('positionNameEn') %>
                            </label>
                            <input type="text" name="position_name_en"
                                   class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ruxchai-primary focus:border-transparent transition-all"
                                   placeholder="<%= t('positionNameEnPlaceholder') %>">
                        </div>

                        <!-- Description -->`;

content = content.replace(
    /placeholder="<%= t\('positionNamePlaceholder'\) %>">\s*<\/div>\s*<!-- Description -->/,
    `placeholder="<%= t('positionNamePlaceholder') %>">\n                        </div>\n${newField}`
);

fs.writeFileSync(path, content);
console.log('Done!');
