import json
import pprint
import time
import re
from requests import get
from bs4 import BeautifulSoup

# URL with links to each 'first level' entry on the Level 4 tree

BASE_URL = "https://en.wikipedia.org"

ENTRY_URL = BASE_URL + "/wiki/Wikipedia:Vital_articles/Level/4"

OUTPUT_FILE = "../www/data/vital_articles_level_4.json"

# Second between requests...

SLEEP_TIME = 2

# Data structure for article tree

articles_tree = {}


def insert_node(struct, one, two, three, four, link, name):
    """ Insert a node with categories one, two, three, four into struct. Wikilink is 'link'
    Subcategory name is 'name' """

    # Hack for inconsistent level: fourth level  is present but third is not

    if three is None and four is not None:
        three = four
        four = None

    # Second level is present but third is not

    if two is None and three is not None:
        two = three
        three = None

    # Insert new categories

    if one is not None:
        if one not in struct:
            struct[one] = {"name": one, "children": {}, "articles": []}
        if two is not None and two not in struct[one]['children']:
            struct[one]['children'][two] = {"name": two, "children": {}, "articles": []}
        if three is not None and three not in struct[one]['children'][two]['children']:
            struct[one]['children'][two]['children'][three] = {"name": three, "children": {}, "articles": []}
        if four is not None and four not in struct[one]['children'][two]['children'][three]['children']:
            struct[one]['children'][two]['children'][three]['children'][four] = {"name": four, "children": {}, "articles": []}

    # Insert articles

    if one is not None:
        if two is not None:
            # If only two levels
            if three is None:
                struct[one]['children'][two]['articles'].append({'link': link, 'name': name})
            else:
                # If only three levels
                if four is None:
                    struct[one]['children'][two]['children'][three]['articles'].append({'link': link, 'name': name})
                else:
                    # Four levels
                    struct[one]['children'][two]['children'][three]['children'][four]['articles'].append({'link': link, 'name': name})


# Retrieve 'index' page of vital articles

print("Retrieving main url {}".format(ENTRY_URL))

page = get(ENTRY_URL)

soup = BeautifulSoup(page.content, 'html.parser')

# Scrape table with main categories links

main_rows = soup.select(".wikitable tr")

for row in main_rows:

    main_cells = row.select("td")

    # Skip the table header and header/footer rows

    if len(main_cells) > 0:

        # Get link and title from second cell

        data_cell = main_cells[1].select_one("a")

        # if data_cell is not None and 'href' in data_cell:

        if data_cell is not None and data_cell.has_attr('href'):

            link = BASE_URL + data_cell['href']
            name = data_cell.string

            if name not in articles_tree:
                articles_tree[name] = {'url': link, 'children': []}


time.sleep(SLEEP_TIME)

final_struct = {}

# Scrape full content of vital article category url

for name, content in articles_tree.items():

    # Retrieve content

    print("*****************")

    print("Retrieving {} from url {}".format(name, content['url']))

    page = get(content['url'])

    soup = BeautifulSoup(page.content, 'html.parser')

    level_one = name
    level_two = None
    level_three = None
    level_four = None
    level_three_node = None

    for child in soup.recursiveChildGenerator():
        name = child.name

        # DFS of the tree: Annotate in vars if we find 'h2', 'h3', 'h4.
        # If we find a 'li', it's an entry
        # TODO: Parse into 'fifth' level the 'p's' (example: in 'People' page,
        #  entry 'Politicians and leaders', subentry 'Europe'

        if name == "h2":
            if len(child.select("span.mw-headline")) > 0:
                if len(child.select_one("span.mw-headline").contents) > 1:
                    name = child.select_one("span.mw-headline").contents[1]
                else:
                    name = child.select_one("span.mw-headline").contents[0]
                level_two = re.sub(r' \(.*\)', '', name)
        if name == "h3":
            if len(child.select("span.mw-headline")) > 0:
                if len(child.select_one("span.mw-headline").contents) > 1:
                    name = child.select_one("span.mw-headline").contents[1]
                else:
                    name = child.select_one("span.mw-headline").contents[0]
                level_three = re.sub(r' \(.*\)', '', name)
                level_three_node = child

        if name == "h4":
            if len(child.select("span.mw-headline")) > 0:
                name = child.select_one("span.mw-headline").contents[0]
                level_four = re.sub(r' \(.*\)', '', name)

        if name == "li":
            if child.parent.name == "ol":
                link = child.select_one("a")
                href = link["href"]
                content = str(link.contents[0])

                # Since h4 node 'memory' can come for another branch, check that
                # immediate sibling (going up) of 'ol' parent is 'h4'

                previous = child.parent.previous_sibling

                while previous is not None and previous.name is None:
                    previous = previous.previous_sibling

                # If previous is an 'h3', remove level_four

                if previous is not None:
                    if previous.name == "h3":
                        level_four = None
                else:
                    # If previous is None, could be that parent is a div separation?
                    # Then look to parent of diving siblings

                    previous_parent = child.parent.parent
                    if previous_parent is not None:
                        if previous_parent.previous_sibling is not None:
                            previous = previous_parent.previous_sibling.previous_sibling

                            # if level_one == "Society and social sciences":
                            #     pprint.pprint(["DEBUG", previous_parent, previous])

                            if previous is not None:

                                if previous.name == "h3":
                                    level_four = None
                                if previous.name == "h2":
                                    level_three = None
                                    level_four = None

                print("============================")
                print("{}/{}/{}/{}/{}".format(level_one, level_two, level_three, level_four, content))

                insert_node(final_struct, level_one, level_two, level_three, level_four, href, content)

    print("WAITING")
    time.sleep(SLEEP_TIME)


# Now, convert tree into a d3 compatible form (mainly, dicts to lists)


my_tree = {'name': "root", 'children': []}


for key_one, entry_one in final_struct.items():

    print(key_one)

    new_data_one = {'name': key_one, 'children': []}

    for key_two, entry_two in entry_one['children'].items():

        print("\t" + key_two)

        new_data_two = {'name': key_two, 'children': []}

        for key_tree, entry_three in entry_two['children'].items():

            print("\t\t" + key_tree)

            new_data_three = {'name': key_tree, 'children': []}

            for key_four, entry_four in entry_three['children'].items():
                print("\t\t\t" + key_four)
                new_data_four = {'name': key_four, 'children': []}

                for article in entry_four['articles']:
                    print("\t\t\t->" + article['name'])

                    new_data_four['children'].append(article)

                new_data_three['children'].append(new_data_four)

            for article in entry_three['articles']:
                print("\t\t->" + article['name'])

                new_data_three['children'].append(article)

            new_data_two['children'].append(new_data_three)

        for article in entry_two['articles']:
            print("\t->" + article['name'])
            new_data_two['children'].append(article)

        new_data_one['children'].append(new_data_two)

    my_tree['children'].append(new_data_one)

print("=======================")
pprint.pprint(my_tree)

json.dump(my_tree, open(OUTPUT_FILE, "w"), indent=4)
