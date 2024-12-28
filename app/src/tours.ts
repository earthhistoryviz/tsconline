export const qsg = [
    {
        target: '.qsg-datapacks',
        content: 'In the Datapacks page, you can select the datapacks required to generate your charts. We offer nine official data packs, each containing a curated collection of datasets tailored for specific thematic explorations. For more detailed guidance on Datapacks, please refer to the Datapacks Tour under the "Tours" section',
        showSkipButton: true,
        hideCloseButton: true
    },
    {
        target: '.qsg-chart',
        content: 'In the Chart page, you can view the charts you have created and explore the detailed visualizations of geologic events. Additionally, you have the option to download and save these charts for your reference or further analysis.',
        showSkipButton: true,
        hideCloseButton: true
    }, {
        target: '.qsg-settings',
        content: 'In the Settings page, you can customize all aspects of your charts. This includes adjusting the scale and time range, selecting which rows to display, setting the background color and font style, etc. Tailor your charts to meet your specific needs and preferences to optimize your visual analysis. For more detailed guidance on Settings, please refer to the Settings Tour under the "Tours" section',
        showSkipButton: true,
        hideCloseButton: true
    }, {
        target: '.qsg-help',
        content: 'In the Help Page, you can find detailed assistance and information on how to use the website.',
        showSkipButton: true,
        hideCloseButton: true
    }, {
        target: '.qsg-workshops',
        content: 'In the Workshops Page, you can access a range of educational and experimental tutorials that offer in-depth guidance. Here, you can explore the workshops you have registered for, allowing you to engage with the content and enhance your skills in a hands-on learning environment.', // Holding off on the Workshops tour until we finish up the backend. Want to make sure it matches any changes we end up making to the page.
        showSkipButton: true,
        hideCloseButton: true
    },
    {
        target: '.qsg-about',
        content: 'The About Page provides information about our development team.',
        showSkipButton: true,
        hideCloseButton: true
    },
    {
        target: '.login-tab',
        content: 'Click here to sign in and unlock the features mentioned earlier, such as accessing registered workshops. Once logged in, you will also have the ability to upload datapacks and take full advantage of all functionalities.',
        showSkipButton: true,
        hideCloseButton: true
    },
]
export const datapacksTour = [
    {
        target: '[data-tour="datapack-display-button"]',
        content: 'Switch between different display types for datapacks: rows, cards, or compact view.',
        showSkipButton: true,
        hideCloseButton: true,
        disableBeacon: true
    }, {
        target: '.add-circle',
        content: 'Add a datapack by clicking the checkbox',
        showSkipButton: true,
        hideCloseButton: true,
        disableBeacon: true
    },
    {
        target: '[data-tour="datapack-deselect-button"]',
        content: 'Click the deselect icon to deselect all datapacks',
        showSkipButton: true,
        hideCloseButton: true,
        disableBeacon: true,
    }, {
        target: '[data-tour="datapack-confirm-button"]',
        content: 'Remember to confirm your selection',
        showSkipButton: true,
        hideCloseButton: true,
        disableBeacon: true
    },

]
export const settingsTour = [
    {
        target: '[setting-tour="setting-tour-Time-tab"]',
        content: 'In the Time settings, you can Set the "Top of Interval" and "Base of Interval" for your data. These fields allow you to define the starting and ending ages or stages, which can be adjusted by entering values or using the dropdown selectors. Adjust the vertical scale to change how much vertical space each million years occupies on your charts. For example, setting it higher will spread the intervals further apart, making each period easier to examine closely. You also can customize the display settings. For instance, you can choose to gray out columns with no data for selected time intervals, add tooltips with additional information, or enable filtering and legend options for the chart. ',
        showSkipButton: true,
        hideCloseButton: true,
        disableBeacon: true
    }, {
        target: '[setting-tour="setting-tour-Column-tab"]',
        content: 'In Column Settings, you can deeply customize the appearance and organization of your charts.In the "Column Customization" area, you can adjust titles and shift row positions to streamline how data is displayed on your charts. Enable or disable specific elements like the chart title and Ma markers to suit your presentation needs. In the "Font Options" section, refine the appearance of your charts by choosing different fonts, sizes, and styles for headers and labels, ensuring important data stands out or meets formatting requirements. Please note that the advanced settings for columns can vary depending on the datapack you are working with, allowing for tailored configurations that best fit the data characteristics.',
        showSkipButton: true,
        hideCloseButton: true,
        disableBeacon: true
    },
    {
        target: '[setting-tour="setting-tour-Search-tab"]',
        content: 'In the Search Settings, you can quickly locate specific columns by entering keywords and then directly add them to your chart. Simply enter a term related to the setting you are looking for, and the system will display all relevant results.This feature is particularly useful when managing numerous data points or when you need to make quick adjustments without browsing through extensive lists.',
        showSkipButton: true,
        hideCloseButton: true,
        disableBeacon: true,
    }, {
        target: '[setting-tour="setting-tour-Font-tab"]',
        content: 'The Font Settings section allows you to customize the appearance of text within your charts. You can adjust font styles, sizes, and formatting for various elements such as column headers, age labels, and more. Each setting is inheritable, ensuring consistency across related elements unless specified otherwise. Changing a font setting here applies it system-wide, but you can override these for individual columns by using the "Change Font" option within each columns settings.Experiment with different fonts and sizes to enhance readability and visual appeal of your charts.',
        showSkipButton: true,
        hideCloseButton: true,
        disableBeacon: true
    },
    {
        target: '[setting-tour="setting-tour-Map Points-tab"]',
        content: 'In the Map Points Settings, you can access and manage geographic data points for different locations. This feature allows you to view specific location details directly on the interactive map. You can toggle different map layers and visualize data points with detailed descriptions, like latitude, longitude, and additional notes. Please note, however, that not all datapacks contain map points.',
        showSkipButton: true,
        hideCloseButton: true,
        disableBeacon: true
    }, {
        target: '[setting-tour="setting-tour-Datapacks-tab"]',
        content: 'In the Datapacks Settings, you can select the datapacks you wish to use for generating charts. We offer nine official datapacks, each comprising a curated collection of datasets tailored for specific thematic explorations. You might notice that this page resembles the Datapack page; selections can be configured here or there interchangeably. For more detailed guidance on how to utilize datapacks, please refer to the Datapacks Tour in the Help page "Tours" section.',
        showSkipButton: true,
        hideCloseButton: true,
        disableBeacon: true
    },
    {
        target: '[setting-tour="load-settings"]',
        content: 'Click here to load your settings from a file. This allows you to quickly apply previously saved configurations to your chart.',
        showSkipButton: true,
        hideCloseButton: true,
        disableBeacon: true
    },
    {
        target: '[setting-tour="save-settings"]',
        content: 'Click here to save your current settings to a file. This is useful for backing up your configurations or sharing them with others.',
        showSkipButton: true,
        hideCloseButton: true,
        disableBeacon: true
    },
]